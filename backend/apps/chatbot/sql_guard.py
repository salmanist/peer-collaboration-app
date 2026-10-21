"""PostgreSQL-aware validation of model-proposed SQL.

DEFENCE IN DEPTH, NOT THE SECURITY BOUNDARY. The boundary is the `chatbot_ro` database
role, which can only SELECT from the views in catalog.VIEWS (see executor.verify_isolation
and docs/ai_chatbot_phase_2_provisioning.sql). This module narrows what is *asked* of that
role to a deliberately small SELECT subset, and fails closed: any AST node type that is not
explicitly handled below is rejected, and so is anything pglast cannot parse.

Accepted: one SELECT over exactly one approved view (no joins, no subqueries, no CTEs, no set
operations, no window functions, no SELECT *), approved columns/functions/operators/casts,
constant values only (no parameters), LIMIT/OFFSET within caps. Aggregate queries must also
carry HAVING count(*) >= MIN_GROUP_SIZE and may not filter/group/sort on quasi-identifiers.

pglast 8.6 bundles the PostgreSQL 17 grammar; the live database is PostgreSQL 18. Newer syntax
simply fails to parse and is rejected (fail closed).
"""

from typing import NamedTuple

from pglast import ast as A
from pglast import enums, parse_sql
from pglast.parser import ParseError

from . import catalog


class SqlRejected(Exception):
    """Raised with a short machine code. The message is fixed text: it never echoes the SQL,
    schema details or parser internals, so it is safe to show to a model or a client."""

    MESSAGES = {
        "empty": "No SQL was provided.",
        "too_long": "The query is too long.",
        "syntax": "The query could not be parsed.",
        "multiple_statements": "Exactly one statement is allowed.",
        "not_select": "Only SELECT queries are allowed.",
        "unsupported_construct": "The query uses an unsupported construct.",
        "star": "SELECT * is not allowed; name the columns.",
        "unapproved_relation": "The query references a relation that is not approved.",
        "unapproved_column": "The query references a column that is not approved.",
        "unapproved_function": "The query uses a function that is not approved.",
        "unapproved_operator": "The query uses an operator that is not approved.",
        "unapproved_type": "The query uses a type that is not approved.",
        "param_not_allowed": "Query parameters are not supported.",
        "too_complex": "The query is too complex.",
        "limit_too_large": "The LIMIT or OFFSET is too large.",
        "aggregate_needs_min_group": (
            f"Aggregate queries must include HAVING count(*) >= {catalog.MIN_GROUP_SIZE}."
        ),
        "aggregate_quasi_identifier": (
            "Aggregate queries cannot filter, group or sort on unique-like columns."
        ),
    }

    def __init__(self, code):
        super().__init__(code)
        self.code = code
        self.message = self.MESSAGES.get(code, "The query was rejected.")


class Validated(NamedTuple):
    sql: str
    view: str
    is_aggregate: bool


class _Walker:
    def __init__(self):
        self.view = None
        self.view_def = None
        self.qualifiers = set()
        self.aliases = {}  # output alias -> set of base columns it was built from
        self.nodes = 0
        self.has_aggregate = False
        self.filter_columns = set()  # columns used in WHERE / GROUP BY / ORDER BY
        self._collect = None  # set currently collecting referenced columns

    # ---- helpers -------------------------------------------------------------------
    def tick(self):
        self.nodes += 1
        if self.nodes > catalog.MAX_AST_NODES:
            raise SqlRejected("too_complex")

    @staticmethod
    def _names(parts):
        out = []
        for p in parts or ():
            if not isinstance(p, A.String):
                raise SqlRejected("unsupported_construct")
            out.append(p.sval)
        return out

    # ---- relations -----------------------------------------------------------------
    def from_clause(self, items):
        if not items or len(items) != 1:
            raise SqlRejected("unsupported_construct")  # joins / multiple relations
        rv = items[0]
        if not isinstance(rv, A.RangeVar):
            raise SqlRejected("unsupported_construct")  # subselects, functions, joins
        if rv.catalogname or rv.relpersistence != "p":
            raise SqlRejected("unapproved_relation")
        if rv.schemaname and rv.schemaname != catalog.SCHEMA:
            raise SqlRejected("unapproved_relation")
        if rv.relname not in catalog.VIEWS:
            raise SqlRejected("unapproved_relation")
        if rv.alias is not None and rv.alias.colnames:
            raise SqlRejected("unsupported_construct")
        self.view = rv.relname
        self.view_def = catalog.VIEWS[rv.relname]
        self.qualifiers = {rv.relname}
        if rv.alias is not None:
            self.qualifiers.add(rv.alias.aliasname)

    # ---- expressions ---------------------------------------------------------------
    def expr(self, node, *, allow_alias=False, in_date_trunc=False):
        self.tick()
        if isinstance(node, A.ColumnRef):
            return self.column(node, allow_alias=allow_alias, in_date_trunc=in_date_trunc)
        if isinstance(node, A.A_Const):
            return self.const(node)
        if isinstance(node, A.A_Expr):
            return self.a_expr(node, allow_alias)
        if isinstance(node, A.BoolExpr):
            for arg in node.args:
                self.expr(arg, allow_alias=allow_alias)
            return None
        if isinstance(node, A.NullTest):
            return self.expr(node.arg, allow_alias=allow_alias)
        if isinstance(node, A.BooleanTest):
            return self.expr(node.arg, allow_alias=allow_alias)
        if isinstance(node, A.CaseExpr):
            if node.arg is not None:
                self.expr(node.arg, allow_alias=allow_alias)
            for when in node.args:
                if not isinstance(when, A.CaseWhen):
                    raise SqlRejected("unsupported_construct")
                self.expr(when.expr, allow_alias=allow_alias)
                self.expr(when.result, allow_alias=allow_alias)
            if node.defresult is not None:
                self.expr(node.defresult, allow_alias=allow_alias)
            return None
        if isinstance(node, A.CoalesceExpr):
            for arg in node.args:
                self.expr(arg, allow_alias=allow_alias)
            return None
        if isinstance(node, A.TypeCast):
            names = self._names(node.typeName.names)
            if node.typeName.setof or node.typeName.arrayBounds:
                raise SqlRejected("unapproved_type")
            base = names[-1] if len(names) == 1 or names[0] == "pg_catalog" else None
            if base not in catalog.ALLOWED_CAST_TYPES or len(names) > 2:
                raise SqlRejected("unapproved_type")
            return self.expr(node.arg, allow_alias=allow_alias)
        if isinstance(node, A.SQLValueFunction):
            allowed = {
                enums.SQLValueFunctionOp.SVFOP_CURRENT_DATE,
                enums.SQLValueFunctionOp.SVFOP_CURRENT_TIMESTAMP,
            }
            if node.op not in allowed:
                raise SqlRejected("unapproved_function")
            return None
        if isinstance(node, A.FuncCall):
            return self.func(node, allow_alias)
        if isinstance(node, A.ParamRef):
            raise SqlRejected("param_not_allowed")
        raise SqlRejected("unsupported_construct")

    def column(self, node, *, allow_alias, in_date_trunc):
        fields = node.fields
        if any(isinstance(f, A.A_Star) for f in fields):
            raise SqlRejected("star")
        names = self._names(fields)
        if len(names) == 2:
            if names[0] not in self.qualifiers:
                raise SqlRejected("unapproved_relation")
            name = names[1]
        elif len(names) == 1:
            name = names[0]
        else:
            raise SqlRejected("unapproved_column")
        if name in self.view_def.columns:
            cols = {name}
        elif allow_alias and len(names) == 1 and name in self.aliases:
            cols = set(self.aliases[name])
        else:
            raise SqlRejected("unapproved_column")
        if self._collect is not None:
            # A timestamp is only harmless when truncated to a coarse unit.
            self._collect.update(c for c in cols if not in_date_trunc)
        return cols

    def const(self, node):
        if node.isnull:
            return None
        val = node.val
        if isinstance(val, A.String):
            if len(val.sval) > 100:
                raise SqlRejected("too_complex")
        elif not isinstance(val, (A.Integer, A.Float, A.Boolean)):
            raise SqlRejected("unsupported_construct")
        return None

    def a_expr(self, node, allow_alias):
        kind = node.kind
        names = self._names(node.name)
        if len(names) != 1:
            raise SqlRejected("unapproved_operator")
        op = names[0]
        K = enums.A_Expr_Kind
        if kind == K.AEXPR_OP:
            if op not in catalog.COMPARISON_OPERATORS | catalog.ARITHMETIC_OPERATORS:
                raise SqlRejected("unapproved_operator")
            if node.lexpr is None:  # prefix operators (-x) are not needed
                raise SqlRejected("unapproved_operator")
            self.expr(node.lexpr, allow_alias=allow_alias)
            self.expr(node.rexpr, allow_alias=allow_alias)
        elif kind in (K.AEXPR_LIKE, K.AEXPR_ILIKE):
            if op not in catalog.LIKE_OPERATORS:
                raise SqlRejected("unapproved_operator")
            self.expr(node.lexpr, allow_alias=allow_alias)
            if not isinstance(node.rexpr, A.A_Const):
                raise SqlRejected("unsupported_construct")
            self.expr(node.rexpr)
        elif kind in (K.AEXPR_IN,):
            if op not in ("=", "<>"):
                raise SqlRejected("unapproved_operator")
            self.expr(node.lexpr, allow_alias=allow_alias)
            items = node.rexpr
            if not isinstance(items, tuple):
                raise SqlRejected("unsupported_construct")
            if not items or len(items) > 20:
                raise SqlRejected("too_complex")
            for item in items:
                if not isinstance(item, A.A_Const):
                    raise SqlRejected("unsupported_construct")
                self.expr(item)
        elif kind in (K.AEXPR_BETWEEN, K.AEXPR_NOT_BETWEEN, K.AEXPR_BETWEEN_SYM, K.AEXPR_NOT_BETWEEN_SYM):
            self.expr(node.lexpr, allow_alias=allow_alias)
            if not isinstance(node.rexpr, tuple) or len(node.rexpr) != 2:
                raise SqlRejected("unsupported_construct")
            for item in node.rexpr:
                self.expr(item, allow_alias=allow_alias)
        else:  # NULLIF, DISTINCT, SIMILAR, ANY/ALL, ...
            raise SqlRejected("unapproved_operator")

    def func(self, node, allow_alias):
        names = self._names(node.funcname)
        if len(names) == 2 and names[0] == "pg_catalog":
            names = names[1:]
        if len(names) != 1 or names[0] not in catalog.ALLOWED_FUNCTIONS:
            raise SqlRejected("unapproved_function")
        name = names[0]
        if node.over is not None or node.agg_filter is not None or node.agg_order or node.agg_within_group or node.func_variadic:
            raise SqlRejected("unsupported_construct")
        if name in catalog.AGGREGATE_FUNCTIONS:
            self.has_aggregate = True
        if node.agg_star:
            if name != "count":
                raise SqlRejected("unapproved_function")
            return None
        if node.agg_distinct and name not in catalog.AGGREGATE_FUNCTIONS:
            raise SqlRejected("unsupported_construct")
        args = node.args or ()
        if name == "date_trunc":
            unit = args[0] if len(args) == 2 else None
            if not isinstance(unit, A.A_Const) or unit.isnull or not isinstance(unit.val, A.String):
                raise SqlRejected("unsupported_construct")
            if unit.val.sval.lower() not in catalog.DATE_TRUNC_UNITS:
                raise SqlRejected("unsupported_construct")
            self.expr(args[1], allow_alias=allow_alias, in_date_trunc=True)
            return None
        if name == "now" and args:
            raise SqlRejected("unsupported_construct")
        if len(args) > 2:
            raise SqlRejected("too_complex")
        # Columns consumed by an aggregate (max(price)) are summarised, not used to pick rows.
        saved = self._collect
        if name in catalog.AGGREGATE_FUNCTIONS:
            self._collect = None
        try:
            for arg in args:
                self.expr(arg, allow_alias=allow_alias)
        finally:
            self._collect = saved
        return None

    # ---- clauses -------------------------------------------------------------------
    def collect(self, nodes, *, allow_alias=False):
        """Validate expressions and record the columns they touch in self.filter_columns."""
        self._collect = self.filter_columns
        try:
            for node in nodes:
                if isinstance(node, A.A_Const):  # GROUP BY 1 / ORDER BY 1 would hide the column
                    raise SqlRejected("unsupported_construct")
                self.expr(node, allow_alias=allow_alias)
        finally:
            self._collect = None

    def target_list(self, targets):
        if not targets:
            raise SqlRejected("unsupported_construct")
        for t in targets:
            if not isinstance(t, A.ResTarget) or t.indirection:
                raise SqlRejected("unsupported_construct")
            local = set()
            self._collect = local
            try:
                self.expr(t.val)
            finally:
                self._collect = None
            if t.name:
                self.aliases[t.name] = local

    def limit(self, node, cap):
        if node is None:
            return
        if not isinstance(node, A.A_Const) or node.isnull or not isinstance(node.val, A.Integer):
            raise SqlRejected("unsupported_construct")
        if not 0 <= node.val.ival <= cap:
            raise SqlRejected("limit_too_large")


def _is_min_group_predicate(node):
    """True for count(*) >= N / count(*) > N-1 / N <= count(*) with N >= MIN_GROUP_SIZE."""

    def is_count_star(n):
        return (
            isinstance(n, A.FuncCall)
            and n.agg_star
            and not n.agg_distinct
            and [s.sval for s in n.funcname] in (["count"], ["pg_catalog", "count"])
        )

    def int_value(n):
        if isinstance(n, A.A_Const) and not n.isnull and isinstance(n.val, A.Integer):
            return n.val.ival
        return None

    if not isinstance(node, A.A_Expr) or node.kind != enums.A_Expr_Kind.AEXPR_OP or len(node.name) != 1:
        return False
    op = node.name[0].sval
    lhs, rhs = node.lexpr, node.rexpr
    flipped = {">=": "<=", ">": "<", "<=": ">=", "<": ">"}
    if int_value(lhs) is not None and is_count_star(rhs):
        lhs, rhs, op = rhs, lhs, flipped.get(op, op)
    if not is_count_star(lhs):
        return False
    n = int_value(rhs)
    if n is None:
        return False
    if op == ">=":
        return n >= catalog.MIN_GROUP_SIZE
    if op == ">":
        return n >= catalog.MIN_GROUP_SIZE - 1
    return False


def _having_has_min_group(having):
    if having is None:
        return False
    if isinstance(having, A.BoolExpr) and having.boolop == enums.BoolExprType.AND_EXPR:
        return any(_having_has_min_group(a) for a in having.args)
    return _is_min_group_predicate(having)


def validate_sql(sql):
    """Return Validated(...) or raise SqlRejected(code)."""
    if not isinstance(sql, str) or not sql.strip():
        raise SqlRejected("empty")
    if len(sql) > catalog.MAX_SQL_CHARS:
        raise SqlRejected("too_long")
    if "\x00" in sql:
        raise SqlRejected("syntax")
    try:
        statements = parse_sql(sql)
    except (ParseError, ValueError, RecursionError):
        raise SqlRejected("syntax") from None
    if len(statements) != 1:
        raise SqlRejected("multiple_statements" if statements else "empty")
    stmt = statements[0].stmt
    if not isinstance(stmt, A.SelectStmt):
        raise SqlRejected("not_select")

    if stmt.op != enums.SetOperation.SETOP_NONE or stmt.larg is not None or stmt.rarg is not None:
        raise SqlRejected("unsupported_construct")
    if stmt.withClause or stmt.intoClause or stmt.lockingClause or stmt.windowClause or stmt.valuesLists:
        raise SqlRejected("unsupported_construct")
    if stmt.groupDistinct or stmt.limitOption not in (
        enums.LimitOption.LIMIT_OPTION_DEFAULT,
        enums.LimitOption.LIMIT_OPTION_COUNT,
    ):
        raise SqlRejected("unsupported_construct")
    if stmt.distinctClause not in (None, (None,)):
        raise SqlRejected("unsupported_construct")  # DISTINCT ON (...)

    w = _Walker()
    w.from_clause(stmt.fromClause)  # first: columns are validated against this view
    w.target_list(stmt.targetList)
    if stmt.whereClause is not None:
        w.collect([stmt.whereClause])
    if stmt.groupClause:
        w.collect(stmt.groupClause)
    if stmt.havingClause is not None:
        w.expr(stmt.havingClause, allow_alias=True)
    sort_exprs = []
    for sb in stmt.sortClause or ():
        if not isinstance(sb, A.SortBy) or sb.useOp:
            raise SqlRejected("unsupported_construct")
        sort_exprs.append(sb.node)
    if sort_exprs:
        w.collect(sort_exprs, allow_alias=True)
    w.limit(stmt.limitCount, catalog.MAX_ROWS)
    w.limit(stmt.limitOffset, catalog.MAX_OFFSET)

    is_aggregate = w.has_aggregate or bool(stmt.groupClause) or stmt.havingClause is not None
    if is_aggregate:
        if not _having_has_min_group(stmt.havingClause):
            raise SqlRejected("aggregate_needs_min_group")
        if w.filter_columns & w.view_def.quasi_identifiers:
            raise SqlRejected("aggregate_quasi_identifier")
    return Validated(sql=sql, view=w.view, is_aggregate=is_aggregate)
