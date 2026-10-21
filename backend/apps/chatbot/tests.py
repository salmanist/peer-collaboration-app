"""Tests for the chatbot database access layer.

Three groups:
  * GuardTests / CatalogTests / SqlFileTests / ExecutorUnitTests / DisposableGuardTests -
    always run, need no database.
  * IntegrationTests - need a PostgreSQL where docs/ai_chatbot_phase_2_provisioning.sql has been
    applied. They SKIP unless both DSNs are set:
        CHATBOT_TEST_DSN        connection string for the chatbot_ro role
        CHATBOT_TEST_OWNER_DSN  connection string for the owner role (seeds + removes its own rows)
    They only run against an explicitly disposable local instance: both DSNs must name the
    literal loopback address (127.0.0.1 or ::1), an explicit non-default port and a database
    called felloo_scratch* / felloo_test*, and the server itself must confirm all of that and
    carry the marker comment FELLOO-DISPOSABLE-LOCAL. Anything else is refused before any
    statement changes data.
  All classes are SimpleTestCase: Django creates no test database (important, the configured
  database is the shared Neon one).
"""

import json
import os
import re
import unittest
from datetime import datetime
from decimal import Decimal
from pathlib import Path
from unittest import mock

import psycopg
from django.core.cache import cache
from django.test import SimpleTestCase
from pglast import ast as A
from pglast import enums, parse_sql
from psycopg import errors as pg_errors
from psycopg import sql as pgsql
from psycopg.conninfo import conninfo_to_dict, make_conninfo

from . import catalog, executor
from .sql_guard import SqlRejected, validate_sql

DOCS = Path(__file__).resolve().parents[3] / "docs"
PROVISIONING_SQL = DOCS / "ai_chatbot_phase_2_provisioning.sql"
VERIFICATION_SQL = DOCS / "ai_chatbot_phase_2_verification.sql"
CLEANUP_SQL = DOCS / "ai_chatbot_phase_2_cleanup.sql"


def rejected_code(sql):
    try:
        validate_sql(sql)
    except SqlRejected as exc:
        return exc.code
    return None


class GuardTests(SimpleTestCase):
    ACCEPTED = [
        "SELECT id, category FROM v_market_listings",
        "select category, price from chatbot.v_market_listings where exchange_type = 'free' order by price desc limit 10",
        "SELECT l.id FROM chatbot.v_market_listings AS l WHERE l.category IN ('books', 'notes')",
        "SELECT code, title FROM v_courses WHERE department_short_name ILIKE 'cs' ORDER BY code LIMIT 20 OFFSET 5",
        "SELECT DISTINCT category FROM v_lost_found_open",
        "SELECT id FROM v_tutors WHERE hourly_fee BETWEEN 100 AND 500 AND is_free = false",
        "SELECT id, CASE WHEN price > 100 THEN 'high' ELSE 'low' END AS band FROM v_market_listings",
        "SELECT lower(name), coalesce(short_name, 'x') FROM v_departments",
        "SELECT title FROM v_announcements ORDER BY created_at DESC LIMIT 5",
        "SELECT category, count(*) AS n FROM v_market_listings GROUP BY category HAVING count(*) >= 3 ORDER BY n DESC",
        "SELECT count(*) FROM v_courses HAVING count(*) > 2",
        "SELECT profile_type, round(avg(average_rating), 1) FROM v_tutors GROUP BY profile_type HAVING count(*) >= 3",
        "SELECT date_trunc('month', created_at) AS m, count(*) FROM v_lost_found_open GROUP BY date_trunc('month', created_at) HAVING count(*) >= 3",
        "SELECT category, count(*) FROM v_market_listings WHERE date_trunc('year', created_at) = now() GROUP BY category HAVING count(*) >= 3 AND count(*) < 100",
    ]

    def test_accepts_approved_selects(self):
        for sql in self.ACCEPTED:
            with self.subTest(sql=sql):
                validate_sql(sql)  # must not raise

    def test_rejects_writes_ddl_and_transaction_commands(self):
        cases = {
            "INSERT INTO v_departments VALUES ('a','b')": "not_select",
            "UPDATE v_departments SET name = 'x'": "not_select",
            "DELETE FROM v_departments": "not_select",
            "TRUNCATE v_departments": "not_select",
            "DROP TABLE accounts_user": "not_select",
            "CREATE TABLE t (a int)": "not_select",
            "ALTER ROLE chatbot_ro SUPERUSER": "not_select",
            "GRANT SELECT ON v_departments TO PUBLIC": "not_select",
            "SET ROLE neondb_owner": "not_select",
            "SET default_transaction_read_only = off": "not_select",
            "BEGIN": "not_select",
            "COMMIT": "not_select",
            "COPY v_departments TO STDOUT": "not_select",
            "CALL some_proc()": "not_select",
            "DO $$ BEGIN PERFORM 1; END $$": "not_select",
            "EXPLAIN ANALYZE SELECT id FROM v_tutors": "not_select",
            "VACUUM": "not_select",
            "LISTEN x": "not_select",
        }
        for sql, code in cases.items():
            with self.subTest(sql=sql):
                self.assertEqual(rejected_code(sql), code)

    def test_rejects_multiple_statements_and_empty(self):
        self.assertEqual(rejected_code("SELECT id FROM v_tutors; SELECT id FROM v_tutors"), "multiple_statements")
        self.assertEqual(rejected_code("SELECT id FROM v_tutors; DROP TABLE accounts_user"), "multiple_statements")
        self.assertEqual(rejected_code(""), "empty")
        self.assertEqual(rejected_code("   "), "empty")
        self.assertEqual(rejected_code("-- just a comment"), "empty")
        self.assertEqual(rejected_code(None), "empty")

    def test_rejects_unparseable_and_oversized(self):
        self.assertEqual(rejected_code("selec id from v_tutors"), "syntax")
        self.assertEqual(rejected_code("SELECT id FROM v_tutors WHERE"), "syntax")
        self.assertEqual(rejected_code("SELECT 1" + " " * catalog.MAX_SQL_CHARS), "too_long")
        self.assertEqual(rejected_code("SELECT id FROM v_tutors\x00"), "syntax")

    def test_rejects_unapproved_relations_and_schemas(self):
        cases = [
            "SELECT id FROM accounts_user",
            "SELECT id FROM public.accounts_user",
            "SELECT email FROM public.accounts_studentroster",
            "SELECT relname FROM pg_class",
            "SELECT relname FROM pg_catalog.pg_class",
            "SELECT rolname FROM pg_authid",
            "SELECT table_name FROM information_schema.tables",
            "SELECT * FROM chatbot.pg_class",
            "SELECT id FROM other_schema.v_market_listings",
            "SELECT id FROM neondb.chatbot.v_market_listings",
            "SELECT id FROM v_market_listings_but_not_approved",
            "SELECT id FROM ONLY accounts_user",
            "SELECT 1",
            "SELECT now()",
            "SELECT id FROM v_tutors TABLESAMPLE SYSTEM (50)",
        ]
        for sql in cases:
            with self.subTest(sql=sql):
                self.assertIn(rejected_code(sql), {"unapproved_relation", "unsupported_construct"})

    def test_rejects_system_catalog_and_function_tricks(self):
        cases = {
            "SELECT pg_sleep(10) FROM v_tutors": "unapproved_function",
            "SELECT pg_read_file('/etc/passwd') FROM v_tutors": "unapproved_function",
            "SELECT set_config('default_transaction_read_only', 'off', false) FROM v_tutors": "unapproved_function",
            "SELECT current_setting('server_version') FROM v_tutors": "unapproved_function",
            "SELECT current_user FROM v_tutors": "unapproved_function",
            "SELECT version() FROM v_tutors": "unapproved_function",
            "SELECT lo_import('/etc/passwd') FROM v_tutors": "unapproved_function",
            "SELECT dblink('x', 'select 1') FROM v_tutors": "unapproved_function",
            "SELECT pg_catalog.pg_sleep(1) FROM v_tutors": "unapproved_function",
            "SELECT id FROM v_tutors WHERE pg_sleep(1) IS NULL": "unapproved_function",
            "SELECT nextval('x') FROM v_tutors": "unapproved_function",
            "SELECT id::regclass FROM v_tutors": "unapproved_type",
            "SELECT id::oid FROM v_tutors": "unapproved_type",
            "SELECT id::int8[] FROM v_tutors": "unapproved_type",
            "SELECT current_database()": "unsupported_construct",
        }
        for sql, code in cases.items():
            with self.subTest(sql=sql):
                self.assertEqual(rejected_code(sql), code)

    def test_rejects_unsafe_cte_subquery_join_and_set_constructs(self):
        cases = [
            "WITH d AS (DELETE FROM accounts_user RETURNING *) SELECT * FROM d",
            "WITH c AS (SELECT id FROM v_tutors) SELECT id FROM c",
            "SELECT id FROM v_tutors WHERE id IN (SELECT id FROM v_tutors)",
            "SELECT (SELECT 1) FROM v_tutors",
            "SELECT id FROM (SELECT id FROM v_tutors) AS t",
            "SELECT a.id FROM v_tutors a JOIN v_tutors b ON a.id = b.id",
            "SELECT a.id FROM v_tutors a, v_market_listings b",
            "SELECT id FROM v_tutors CROSS JOIN v_courses",
            "SELECT id FROM v_tutors UNION SELECT id FROM v_market_listings",
            "SELECT id FROM v_tutors INTERSECT SELECT id FROM v_market_listings",
            "SELECT id INTO newtable FROM v_tutors",
            "SELECT id FROM v_tutors FOR UPDATE",
            "SELECT id, row_number() OVER () FROM v_tutors",
            "SELECT id FROM v_tutors WINDOW w AS (ORDER BY id)",
            "SELECT DISTINCT ON (profile_type) id FROM v_tutors",
            "VALUES (1)",
            "SELECT id FROM v_tutors WHERE EXISTS (SELECT 1)",
            "SELECT id FROM v_tutors WHERE id = ANY (ARRAY[1,2])",
            "SELECT id FROM v_tutors LIMIT 5 OFFSET 2 FETCH FIRST 3 ROWS WITH TIES",
        ]
        for sql in cases:
            with self.subTest(sql=sql):
                self.assertIsNotNone(rejected_code(sql))

    def test_rejects_star_unapproved_columns_and_private_names(self):
        self.assertEqual(rejected_code("SELECT * FROM v_tutors"), "star")
        self.assertEqual(rejected_code("SELECT v_tutors.* FROM v_tutors"), "star")
        self.assertEqual(rejected_code("SELECT user_id FROM v_tutors"), "unapproved_column")
        self.assertEqual(rejected_code("SELECT email FROM v_tutors"), "unapproved_column")
        self.assertEqual(rejected_code("SELECT message FROM v_announcements"), "unapproved_column")
        self.assertIsNone(rejected_code("SELECT title, category FROM v_announcements ORDER BY created_at DESC LIMIT 5"))
        self.assertEqual(rejected_code("SELECT bio FROM v_tutors"), "unapproved_column")
        self.assertEqual(rejected_code("SELECT description FROM v_market_listings"), "unapproved_column")
        self.assertEqual(rejected_code('SELECT "ID" FROM v_tutors'), "unapproved_column")
        self.assertEqual(rejected_code("SELECT id FROM v_tutors WHERE secret = 1"), "unapproved_column")
        self.assertEqual(rejected_code("SELECT x.id FROM v_tutors"), "unapproved_relation")
        self.assertEqual(rejected_code("SELECT other.v_tutors.id FROM v_tutors"), "unapproved_column")
        # a column that exists in a DIFFERENT approved view is still not approved here
        self.assertEqual(rejected_code("SELECT title FROM v_market_listings"), "unapproved_column")

    def test_rejects_parameters_operators_and_unsafe_expressions(self):
        self.assertEqual(rejected_code("SELECT id FROM v_tutors WHERE id = $1"), "param_not_allowed")
        self.assertEqual(rejected_code("SELECT id FROM v_tutors WHERE id = %s"), "syntax")
        self.assertEqual(rejected_code("SELECT id FROM v_tutors WHERE profile_type ~ 'a+'"), "unapproved_operator")
        self.assertEqual(rejected_code("SELECT id FROM v_tutors WHERE profile_type SIMILAR TO 'a%'"), "unapproved_operator")
        self.assertEqual(rejected_code("SELECT id FROM v_tutors WHERE NULLIF(id, 1) = 2"), "unapproved_operator")
        self.assertEqual(rejected_code("SELECT id || 'x' FROM v_tutors"), "unapproved_operator")
        self.assertEqual(rejected_code("SELECT id FROM v_tutors WHERE id @> 3"), "unapproved_operator")
        self.assertEqual(rejected_code("SELECT -id FROM v_tutors"), "unapproved_operator")
        self.assertEqual(rejected_code("SELECT id FROM v_tutors WHERE profile_type LIKE lower(profile_type)"), "unsupported_construct")
        self.assertEqual(rejected_code("SELECT id[1] FROM v_tutors"), "unsupported_construct")
        self.assertEqual(rejected_code("SELECT id FROM v_tutors WHERE profile_type = 'a' || 'b'"), "unapproved_operator")
        self.assertEqual(rejected_code("SELECT id FROM v_tutors WHERE profile_type = '" + "x" * 101 + "'"), "too_complex")
        in_list = ",".join(str(i) for i in range(21))
        self.assertEqual(rejected_code(f"SELECT id FROM v_tutors WHERE id IN ({in_list})"), "too_complex")

    def test_enforces_limit_and_offset_caps(self):
        self.assertIsNone(rejected_code(f"SELECT id FROM v_tutors LIMIT {catalog.MAX_ROWS}"))
        self.assertEqual(rejected_code(f"SELECT id FROM v_tutors LIMIT {catalog.MAX_ROWS + 1}"), "limit_too_large")
        self.assertEqual(rejected_code(f"SELECT id FROM v_tutors OFFSET {catalog.MAX_OFFSET + 1}"), "limit_too_large")
        self.assertEqual(rejected_code("SELECT id FROM v_tutors LIMIT -1"), "limit_too_large")
        self.assertEqual(rejected_code("SELECT id FROM v_tutors LIMIT ALL"), "unsupported_construct")
        self.assertEqual(rejected_code("SELECT id FROM v_tutors LIMIT (SELECT 5)"), "unsupported_construct")

    def test_complexity_limit(self):
        big = " AND ".join("id<>1" for _ in range(110))  # ~1.2k chars (under the length cap), >300 AST nodes
        self.assertLess(len(big), catalog.MAX_SQL_CHARS)
        self.assertEqual(rejected_code(f"SELECT id FROM v_tutors WHERE {big}"), "too_complex")

    # ---- minimum group size and inference safeguards -------------------------------------
    def test_aggregate_requires_min_group_having(self):
        needs = "aggregate_needs_min_group"
        self.assertEqual(rejected_code("SELECT count(*) FROM v_market_listings"), needs)
        self.assertEqual(rejected_code("SELECT category, count(*) FROM v_market_listings GROUP BY category"), needs)
        self.assertEqual(rejected_code("SELECT category, count(*) FROM v_market_listings GROUP BY category HAVING count(*) >= 1"), needs)
        self.assertEqual(rejected_code("SELECT category, count(*) FROM v_market_listings GROUP BY category HAVING count(*) >= 2"), needs)
        self.assertEqual(rejected_code("SELECT category, count(*) FROM v_market_listings GROUP BY category HAVING count(*) > 1"), needs)
        self.assertEqual(rejected_code("SELECT category, count(*) FROM v_market_listings GROUP BY category HAVING count(*) <= 100"), needs)
        self.assertEqual(rejected_code("SELECT category FROM v_market_listings GROUP BY category HAVING max(price) > 3"), needs)
        self.assertEqual(rejected_code("SELECT category FROM v_market_listings GROUP BY category HAVING count(*) >= 3 OR count(*) = 1"), needs)
        self.assertEqual(rejected_code("SELECT category FROM v_market_listings GROUP BY category HAVING count(DISTINCT id) >= 3"), needs)
        self.assertEqual(rejected_code("SELECT category FROM v_market_listings GROUP BY category HAVING count(price) >= 3"), needs)
        self.assertEqual(rejected_code("SELECT 1 FROM v_market_listings HAVING true"), needs)
        for ok in (">= 3", "> 2", ">= 10"):
            self.assertIsNone(rejected_code(f"SELECT category, count(*) FROM v_market_listings GROUP BY category HAVING count(*) {ok}"))
        self.assertIsNone(rejected_code("SELECT category FROM v_market_listings GROUP BY category HAVING 3 <= count(*)"))
        self.assertIsNone(rejected_code("SELECT category, avg(price) FROM v_market_listings GROUP BY category HAVING count(*) >= 3 AND avg(price) > 10"))

    def test_aggregate_cannot_filter_or_group_on_quasi_identifiers(self):
        q = "aggregate_quasi_identifier"
        base = "SELECT category, count(*) FROM v_market_listings"
        having = " HAVING count(*) >= 3"
        self.assertEqual(rejected_code(f"{base} WHERE id = 5 GROUP BY category{having}"), q)
        self.assertEqual(rejected_code(f"{base} WHERE id > 5 GROUP BY category{having}"), q)
        self.assertEqual(rejected_code(f"{base} WHERE price = 150 GROUP BY category{having}"), q)
        self.assertEqual(rejected_code(f"{base} WHERE created_at > '2026-10-01 10:00:00' GROUP BY category{having}"), q)
        self.assertEqual(rejected_code(f"{base} WHERE created_at::date = '2026-10-01' GROUP BY category{having}"), q)
        self.assertEqual(rejected_code(f"{base} GROUP BY category, price{having}"), q)
        self.assertEqual(rejected_code(f"{base} GROUP BY category, created_at{having}"), q)
        self.assertEqual(rejected_code(f"{base} GROUP BY category{having} ORDER BY max(price)"), None)  # aggregate in ORDER BY is fine
        self.assertEqual(rejected_code(f"SELECT price, count(*) AS n FROM v_market_listings GROUP BY category{having} ORDER BY price"), q)
        # positional references would hide the column from the check
        self.assertEqual(rejected_code(f"SELECT created_at, count(*) FROM v_market_listings GROUP BY 1{having}"), "unsupported_construct")
        self.assertEqual(rejected_code(f"{base} GROUP BY category{having} ORDER BY 1"), "unsupported_construct")
        # an alias for a quasi-identifier is followed
        self.assertEqual(rejected_code(f"SELECT price AS p, count(*) FROM v_market_listings GROUP BY price{having}"), q)
        # coarse date truncation is allowed, fine truncation is not
        self.assertIsNone(rejected_code(f"SELECT date_trunc('month', created_at) AS m, count(*) FROM v_market_listings GROUP BY date_trunc('month', created_at){having} ORDER BY m"))
        self.assertEqual(rejected_code(f"SELECT date_trunc('day', created_at) AS d, count(*) FROM v_market_listings GROUP BY 1{having}"), "unsupported_construct")
        self.assertEqual(rejected_code(f"SELECT date_trunc('hour', created_at), count(*) FROM v_market_listings GROUP BY date_trunc('hour', created_at){having}"), "unsupported_construct")
        # non-aggregate (row) queries may filter on those columns: rows carry no identity
        self.assertIsNone(rejected_code("SELECT id, price FROM v_market_listings WHERE price = 150 AND id > 5"))


class CatalogTests(SimpleTestCase):
    PROHIBITED_TOKENS = {
        "email", "phone", "roll", "password", "token", "otp", "lat", "lng", "latitude", "longitude",
        "gps", "plate", "image", "file", "document", "description", "bio", "abstract", "body",
        "contact", "author", "owner", "poster", "requester", "creator", "user", "hash", "secret",
        "cnic", "address", "claimant", "sender", "link", "headline", "availability", "subjects", "skills",
        "message",
    }

    def test_no_prohibited_columns_in_any_approved_view(self):
        for view, definition in catalog.VIEWS.items():
            for column in definition.columns:
                with self.subTest(view=view, column=column):
                    self.assertFalse(set(column.split("_")) & self.PROHIBITED_TOKENS)

    def test_quasi_identifiers_are_real_columns(self):
        for view, definition in catalog.VIEWS.items():
            with self.subTest(view=view):
                self.assertLessEqual(definition.quasi_identifiers, definition.columns)

    def test_every_numeric_or_timestamp_column_is_treated_as_quasi_identifier(self):
        # id / created_at / numeric measures can single out a row, so they must be listed.
        for view, definition in catalog.VIEWS.items():
            for column in definition.columns:
                if column in {"id", "created_at", "price", "hourly_fee", "average_rating",
                              "total_reviews", "upvote_count", "date_lost_or_found"}:
                    with self.subTest(view=view, column=column):
                        self.assertIn(column, definition.quasi_identifiers)

    def test_provisioning_sql_views_match_catalog_exactly(self):
        text = PROVISIONING_SQL.read_text(encoding="utf-8")
        views = {}
        for raw in parse_sql(text):
            stmt = raw.stmt
            if isinstance(stmt, A.ViewStmt):
                self.assertEqual(stmt.view.schemaname, catalog.SCHEMA)
                select = stmt.query
                self.assertIsInstance(select, A.SelectStmt)
                names = []
                for target in select.targetList:
                    self.assertIsInstance(target, A.ResTarget)
                    if target.name:
                        names.append(target.name)
                    else:
                        ref = target.val
                        self.assertIsInstance(ref, A.ColumnRef, "SELECT * or expression without alias")
                        self.assertNotIsInstance(ref.fields[-1], A.A_Star)
                        names.append(ref.fields[-1].sval)
                views[stmt.view.relname] = set(names)
                options = {o.defname: o.arg for o in (stmt.options or ())}
                self.assertIn("security_barrier", options, f"{stmt.view.relname} lacks security_barrier")
        self.assertEqual(set(views), set(catalog.VIEWS))
        for name, columns in views.items():
            with self.subTest(view=name):
                self.assertEqual(columns, set(catalog.VIEWS[name].columns))

    def test_provisioning_sql_grants_only_documented_objects(self):
        text = PROVISIONING_SQL.read_text(encoding="utf-8")
        executable = "\n".join(re.sub(r"--.*$", "", line) for line in text.splitlines())
        self.assertNotRegex(executable, r"(?i)\bPASSWORD\s+'")           # no password in the file
        self.assertNotRegex(executable, r"(?i)\bSUPERUSER\b(?<!NOSUPERUSER)")
        self.assertNotRegex(executable, r"(?i)\bGRANT\b[^;]*\bTO\s+PUBLIC\b")
        self.assertNotRegex(executable, r"(?i)\bBYPASSRLS\b(?<!NOBYPASSRLS)")
        # chatbot_ro is only ever granted SELECT on chatbot.* views, USAGE on the schema, CONNECT
        for statement in executable.split(";"):
            if re.match(r"(?is)\s*GRANT.*TO\s+chatbot_ro", statement):
                clause = re.sub(r"\s+", " ", statement).strip()
                self.assertTrue(
                    re.match(r"(?i)GRANT (SELECT ON chatbot\.|USAGE ON SCHEMA chatbot )", clause)
                    or "GRANT CONNECT ON DATABASE" in clause,
                    msg=clause[:100],
                )


def _executable(path):
    """File text with -- comments removed (what a SQL client would actually run)."""
    return "\n".join(re.sub(r"--.*$", "", line) for line in path.read_text(encoding="utf-8").splitlines())


def _column_grants(path, *, grant):
    """{(table, frozenset(columns))} for column-level SELECT granted to / revoked from chatbot_view_owner."""
    found = set()
    for raw in parse_sql(path.read_text(encoding="utf-8")):
        stmt = raw.stmt
        if not isinstance(stmt, A.GrantStmt) or bool(stmt.is_grant) != grant:
            continue
        if [g.rolename for g in stmt.grantees] != ["chatbot_view_owner"]:
            continue
        priv = stmt.privileges[0]
        if priv.priv_name == "select" and priv.cols:
            found.add((stmt.objects[0].relname, frozenset(c.sval for c in priv.cols)))
    return found


def _do_body(stmt):
    """PL/pgSQL source of a parsed DO statement."""
    return [arg.arg.sval for arg in stmt.args if arg.defname == "as"][0]

class SqlFileTests(SimpleTestCase):
    """Offline checks of the review-only SQL files. They parse and cross-check the files; they
    do NOT execute anything and prove nothing about Neon."""

    def test_files_state_their_validation_scope_and_document_the_psql_procedure(self):
        header = PROVISIONING_SQL.read_text(encoding="utf-8").split("BEGIN;")[0]
        for needle in ("ON_ERROR_STOP=1", "BRANCH", "DIRECT", "psql", "SEPARATE", "NEVER been run on Neon", "EXIT STATUS IS NOT A SUCCESS SIGNAL", "$? must be 0"):
            with self.subTest(needle=needle):
                self.assertIn(needle, header)
        for path in (PROVISIONING_SQL, VERIFICATION_SQL, CLEANUP_SQL):
            with self.subTest(file=path.name):
                text = path.read_text(encoding="utf-8")
                # the status line must say what was validated and where, and must not claim the files were never run
                self.assertIn("VALIDATED ON DISPOSABLE LOCAL POSTGRESQL ONLY", text[:900])
                self.assertIn("NOT VALIDATED ON NEON", text[:900])
                self.assertNotIn("NOT EXECUTED", text)
                self.assertNotIn("never been run anywhere", text)
                self.assertIn("psql -X", text[:3000])  # skip a personal psqlrc
                self.assertNotRegex(text, r"(?i)postgres(ql)?://")  # no connection strings
                self.assertNotRegex(_executable(path), r"(?i)\bPASSWORD\s+'")

    def test_provisioning_is_one_transaction_with_assertions_before_commit(self):
        statements = [raw.stmt for raw in parse_sql(PROVISIONING_SQL.read_text(encoding="utf-8"))]
        kinds = [s.kind for s in statements if isinstance(s, A.TransactionStmt)]
        self.assertEqual(kinds, [enums.TransactionStmtKind.TRANS_STMT_BEGIN, enums.TransactionStmtKind.TRANS_STMT_COMMIT])
        self.assertIsInstance(statements[0], A.TransactionStmt)
        self.assertIsInstance(statements[-1], A.TransactionStmt)
        text = _executable(PROVISIONING_SQL)
        commit_at = text.rindex("COMMIT;")
        for needle in (
            "REVOKE CREATE ON SCHEMA chatbot FROM chatbot_view_owner",
            "SET LOCAL ROLE is not in effect",
            "assert: chatbot_ro can create objects",
            "assert: role-level settings",
        ):
            with self.subTest(needle=needle):
                self.assertIn(needle, text)
                self.assertLess(text.index(needle), commit_at)
        self.assertLess(text.index("SET LOCAL ROLE chatbot_view_owner"), text.index("SET LOCAL ROLE is not in effect"))
        self.assertLess(text.index("SET LOCAL ROLE is not in effect"), text.index("CREATE VIEW"))
        self.assertLess(text.index("RESET ROLE"), text.index("REVOKE CREATE ON SCHEMA chatbot"))

    def test_assertions_cannot_pass_on_no_rows_or_fail_on_non_neon_servers(self):
        text = _executable(PROVISIONING_SQL)
        self.assertNotRegex(text, r"IF\s+bad\s*>\s*0")        # NULL > 0 would silently pass
        self.assertIn("IS DISTINCT FROM", text)
        self.assertNotIn("pg_has_role('chatbot_ro', 'neon_superuser'", text)  # errors where that role does not exist
        self.assertIn("'chatbot_ro'::regrole", text)          # raises if the role is missing

    def test_provisioning_changes_nothing_that_django_uses(self):
        statements = [raw.stmt for raw in parse_sql(PROVISIONING_SQL.read_text(encoding="utf-8"))]
        for stmt in statements:
            if isinstance(stmt, A.GrantStmt):
                grantees = [(g.roletype, g.rolename) for g in stmt.grantees]
                self.assertNotIn(enums.RoleSpecType.ROLESPEC_PUBLIC, [g[0] for g in grantees], "no GRANT/REVOKE touching PUBLIC")
                if not stmt.is_grant:  # every REVOKE targets only the two chatbot roles
                    self.assertTrue(all(name in ("chatbot_ro", "chatbot_view_owner") for _, name in grantees))
            self.assertNotIsInstance(
                stmt, (A.InsertStmt, A.UpdateStmt, A.DeleteStmt, A.DropStmt, A.TruncateStmt, A.AlterTableStmt, A.DropRoleStmt)
            )
        self.assertEqual(len([s for s in statements if isinstance(s, A.AlterDefaultPrivilegesStmt)]), 1)

    def test_provisioning_never_rewrites_acls_of_unrelated_tables_or_sequences(self):
        # Local validation: REVOKE ... ON ALL TABLES/SEQUENCES IN SCHEMA public turned the default
        # (NULL) ACL of every table and sequence into an explicit one, and cleanup cannot undo it.
        statements = [raw.stmt for raw in parse_sql(PROVISIONING_SQL.read_text(encoding="utf-8"))]
        for stmt in statements:
            if isinstance(stmt, A.GrantStmt):
                self.assertNotEqual(stmt.targtype, enums.GrantTargetType.ACL_TARGET_ALL_IN_SCHEMA, "no bulk GRANT/REVOKE")
                if not stmt.is_grant:  # the only plain REVOKEs left are on schemas (public, chatbot)
                    self.assertEqual(stmt.objtype, enums.ObjectType.OBJECT_SCHEMA)
        self.assertNotRegex(_executable(PROVISIONING_SQL), r"(?i)\bON\s+ALL\s+(TABLES|SEQUENCES|FUNCTIONS|ROUTINES)\b")

    def test_announcements_do_not_expose_message(self):
        self.assertNotIn("message", catalog.VIEWS["v_announcements"].columns)
        notification_grants = [
            cols for table, cols in _column_grants(PROVISIONING_SQL, grant=True) if table == "notifications_campusnotification"
        ]
        self.assertEqual(len(notification_grants), 1)
        self.assertNotIn("message", notification_grants[0])

    def test_cleanup_mirrors_every_provisioning_grant(self):
        granted = _column_grants(PROVISIONING_SQL, grant=True)
        revoked = _column_grants(CLEANUP_SQL, grant=False)
        self.assertEqual(len(granted), 12)
        self.assertEqual(granted, revoked)

    def test_cleanup_guard_runs_inside_the_transaction_before_anything_destructive(self):
        statements = [raw.stmt for raw in parse_sql(CLEANUP_SQL.read_text(encoding="utf-8"))]
        self.assertTrue(_executable(CLEANUP_SQL).lstrip().startswith("BEGIN;"), "nothing may precede BEGIN")
        self.assertIsInstance(statements[0], A.TransactionStmt)
        self.assertEqual(statements[0].kind, enums.TransactionStmtKind.TRANS_STMT_BEGIN)
        guard, identity = statements[1], statements[2]
        self.assertIsInstance(guard, A.DoStmt)
        self.assertIsInstance(identity, A.DoStmt)
        guard_body = _do_body(guard)
        self.assertIn("cleanup guard", guard_body)
        self.assertIn("RAISE EXCEPTION", guard_body)
        self.assertNotIn("IF ", guard_body)  # unconditional: always raises until it is deliberately deleted
        # Exactly one BEGIN and one COMMIT: no ROLLBACK, SAVEPOINT or second transaction that
        # could let later statements run after the guard has failed.
        transaction = [s for s in statements if isinstance(s, A.TransactionStmt)]
        self.assertEqual(
            [s.kind for s in transaction],
            [enums.TransactionStmtKind.TRANS_STMT_BEGIN, enums.TransactionStmtKind.TRANS_STMT_COMMIT],
        )
        self.assertIs(statements[-1], transaction[1])
        destructive = (A.DropStmt, A.DropRoleStmt, A.GrantStmt, A.GrantRoleStmt, A.AlterDefaultPrivilegesStmt, A.VariableSetStmt)
        for stmt in statements[:3]:
            self.assertNotIsInstance(stmt, destructive)
        self.assertTrue(any(isinstance(s, destructive) for s in statements[3:]))
        self.assertIn("-X", CLEANUP_SQL.read_text(encoding="utf-8")[:3000])  # ignore a personal psqlrc (ON_ERROR_ROLLBACK)

    def test_cleanup_verifies_identity_before_dropping_anything(self):
        executable = _executable(CLEANUP_SQL)
        before_first_drop = executable[: executable.index("DROP SCHEMA")]
        for needle in (
            "felloo-chatbot-v2:",
            "shobj_description",
            "obj_description('chatbot'::regnamespace",
            "pg_get_userbyid(nspowner)",
            "current_user",
            "relkind <> 'v'",
            "pg_get_userbyid(relowner) <> 'chatbot_view_owner'",
            "pg_proc",
            "IS DISTINCT FROM 10",
        ):
            with self.subTest(needle=needle):
                self.assertIn(needle, before_first_drop)
        for view in catalog.VIEWS:
            with self.subTest(view=view):
                self.assertIn(f"'{view}'", before_first_drop)

    def test_provisioning_writes_identity_markers_that_cleanup_requires(self):
        statements = [raw.stmt for raw in parse_sql(PROVISIONING_SQL.read_text(encoding="utf-8"))]
        comments = {
            (c.objtype, c.object.sval): c.comment for c in statements if isinstance(c, A.CommentStmt)
        }
        self.assertEqual(
            set(comments),
            {
                (enums.ObjectType.OBJECT_ROLE, "chatbot_ro"),
                (enums.ObjectType.OBJECT_ROLE, "chatbot_view_owner"),
                (enums.ObjectType.OBJECT_SCHEMA, "chatbot"),
            },
        )
        for key, comment in comments.items():
            with self.subTest(object=key):
                self.assertTrue(comment.startswith("felloo-chatbot-v2:"))
        provisioning, cleanup = _executable(PROVISIONING_SQL), _executable(CLEANUP_SQL)
        self.assertIn("LIKE 'felloo-chatbot-v2:%'", provisioning)  # provisioning asserts them too (check 11)
        self.assertIn("LIKE 'felloo-chatbot-v2:%'", cleanup)

    def test_temporary_membership_options_are_asserted_before_the_revoke_and_after_it(self):
        text = _executable(PROVISIONING_SQL)
        reset, revoke = text.index("RESET ROLE;"), text.index("REVOKE chatbot_view_owner FROM CURRENT_USER;")
        self.assertLess(reset, revoke)
        before = text[reset:revoke]
        for needle in ("pg_auth_members", "set_option", "NOT inherit_option", "NOT admin_option", "grantor", "RAISE EXCEPTION"):
            with self.subTest(needle=needle):
                self.assertIn(needle, before)
        after = text[revoke : text.rindex("COMMIT;")]
        self.assertIn("(set_option OR inherit_option)", after)  # nothing granted by this role keeps SET/INHERIT

    def test_cleanup_removes_everything_provisioning_creates(self):
        statements = [raw.stmt for raw in parse_sql(CLEANUP_SQL.read_text(encoding="utf-8"))]
        executable = _executable(CLEANUP_SQL)
        dropped_roles = {r.rolename for s in statements if isinstance(s, A.DropRoleStmt) for r in s.roles}
        self.assertEqual(dropped_roles, {"chatbot_ro", "chatbot_view_owner"})
        schemas = [s for s in statements if isinstance(s, A.DropStmt) and s.removeType == enums.ObjectType.OBJECT_SCHEMA]
        self.assertEqual(len(schemas), 1)
        self.assertEqual(schemas[0].behavior, enums.DropBehavior.DROP_CASCADE)
        restore = [s for s in statements if isinstance(s, A.AlterDefaultPrivilegesStmt)]
        self.assertEqual(len(restore), 1)
        self.assertTrue(restore[0].action.is_grant)  # undoes provisioning's REVOKE ... FROM PUBLIC
        self.assertLess(executable.index("SET LOCAL ROLE chatbot_view_owner"), executable.index("ALTER DEFAULT PRIVILEGES"))
        self.assertLess(executable.index("ALTER DEFAULT PRIVILEGES"), executable.index("RESET ROLE"))
        self.assertLess(executable.index("DROP SCHEMA"), executable.index("DROP ROLE"))
        self.assertLess(executable.index("DROP ROLE"), executable.rindex("COMMIT;"))

    # ---- database ACL: provisioning and cleanup must restore ANY baseline ----------------------
    @staticmethod
    def _model_provision(acl):
        """What provisioning's database-ACL DO block does to a database ACL, entries as
        {(grantee, privilege)}. acl=None is PostgreSQL's built-in default (NULL). The owner and
        PUBLIC defaults below are how PostgreSQL interprets NULL; they are not written anywhere."""
        effective = acl if acl is not None else {("PUBLIC", "CONNECT"), ("PUBLIC", "TEMPORARY"), ("owner", "CONNECT")}
        if ("PUBLIC", "CONNECT") in effective or ("chatbot_ro", "CONNECT") in effective:
            return acl  # IF NOT has_database_privilege(...) is false: nothing is written
        return set(effective) | {("chatbot_ro", "CONNECT")}

    @staticmethod
    def _model_cleanup(acl):
        """Cleanup's DO block: revoke only when chatbot_ro has an explicit entry."""
        if acl is not None and any(grantee == "chatbot_ro" for grantee, _ in acl):
            return {entry for entry in acl if entry[0] != "chatbot_ro"}
        return acl

    def test_database_acl_round_trips_for_null_and_explicit_baselines(self):
        baselines = {
            "NULL (default)": None,
            "explicit, PUBLIC keeps CONNECT": {("owner", "CONNECT"), ("PUBLIC", "CONNECT"), ("PUBLIC", "TEMPORARY")},
            "explicit, PUBLIC CONNECT revoked": {("owner", "CONNECT"), ("owner", "CREATE"), ("PUBLIC", "TEMPORARY")},
            "explicit with an unrelated role grant": {("owner", "CONNECT"), ("reporting", "CONNECT"), ("reporting", "CREATE")},
            "explicit but empty of PUBLIC": set(),
        }
        for name, baseline in baselines.items():
            with self.subTest(baseline=name):
                provisioned = self._model_provision(baseline)
                self.assertEqual(self._model_cleanup(provisioned), baseline)
                self.assertTrue(
                    provisioned is None or ("PUBLIC", "CONNECT") in provisioned or ("chatbot_ro", "CONNECT") in provisioned,
                    "chatbot_ro must be able to connect after provisioning",
                )
        # the model's key claims: default ACLs are never written; a revoked-PUBLIC ACL gains exactly one entry
        self.assertIsNone(self._model_provision(None))
        self.assertEqual(
            self._model_provision(baselines["explicit, PUBLIC CONNECT revoked"]) - baselines["explicit, PUBLIC CONNECT revoked"],
            {("chatbot_ro", "CONNECT")},
        )

    def test_database_acl_statements_match_the_round_trip_model(self):
        provisioning, cleanup = _executable(PROVISIONING_SQL), _executable(CLEANUP_SQL)
        # provisioning: no unconditional database GRANT/REVOKE, no hard-coded ACL, one guarded GRANT of CONNECT only
        self.assertEqual(len(re.findall(r"(?i)ON DATABASE", provisioning)), 1)
        guarded = re.search(
            r"(?is)IF NOT has_database_privilege\('chatbot_ro', current_database\(\), 'CONNECT'\) THEN\s*"
            r"EXECUTE format\('GRANT CONNECT ON DATABASE %I TO chatbot_ro', current_database\(\)\);\s*END IF;",
            provisioning,
        )
        self.assertIsNotNone(guarded, "the database GRANT must be guarded by has_database_privilege(... 'CONNECT')")
        # cleanup: one REVOKE, naming only chatbot_ro, only when chatbot_ro has its own explicit entry
        self.assertEqual(len(re.findall(r"(?i)ON DATABASE", cleanup)), 1)
        guarded = re.search(
            r"(?is)IF EXISTS \(SELECT 1 FROM pg_database AS d CROSS JOIN LATERAL aclexplode\(d\.datacl\) AS a\s*"
            r"WHERE d\.datname = current_database\(\) AND a\.grantee = 'chatbot_ro'::regrole\) THEN\s*"
            r"EXECUTE format\('REVOKE ALL ON DATABASE %I FROM chatbot_ro', current_database\(\)\);\s*END IF;",
            cleanup,
        )
        self.assertIsNotNone(guarded, "the database REVOKE must run only when chatbot_ro has an explicit database ACL entry")
        for text in (provisioning, cleanup):
            self.assertNotRegex(text, r"(?i)ON DATABASE[^;]*PUBLIC")      # never touches PUBLIC's entry
            self.assertNotRegex(text, r"(?i)ALTER DATABASE|ALTER DEFAULT PRIVILEGES\s+IN\s+DATABASE")
            self.assertNotRegex(text, r"=[CTc]+/")                              # no observed ACL string hard-coded
        # the schema and table ACL rewrites found earlier must not return either
        self.assertNotRegex(provisioning, r"(?i)ON SCHEMA public")

    @staticmethod
    def _model_probe_login(acl):
        """The over-privileged-role test's CONNECT handling on a database ACL (set of (grantee,
        privilege) entries, None = NULL default): returns (acl while the test runs, acl afterwards)."""
        effective = acl if acl is not None else {("PUBLIC", "CONNECT")}
        if ("PUBLIC", "CONNECT") in effective:
            return acl, acl  # has_database_privilege is true: nothing granted, nothing to revoke
        during = set(effective) | {("chatbot_bad", "CONNECT")}
        return during, {entry for entry in during if entry[0] != "chatbot_bad"}

    def test_probe_role_login_grant_round_trips_for_every_database_acl_baseline(self):
        baselines = {
            "NULL": None,
            "explicit, PUBLIC CONNECT kept": {("owner", "CONNECT"), ("PUBLIC", "CONNECT"), ("PUBLIC", "TEMPORARY")},
            "explicit, PUBLIC CONNECT revoked": {("owner", "CONNECT"), ("PUBLIC", "TEMPORARY")},
            "explicit, revoked, with an unrelated role grant": {("owner", "CONNECT"), ("reporting", "CONNECT"), ("reporting", "TEMPORARY")},
            "explicit, revoked, chatbot_ro already granted": {("owner", "CONNECT"), ("chatbot_ro", "CONNECT")},
        }
        for name, baseline in baselines.items():
            with self.subTest(baseline=name):
                during, after = self._model_probe_login(baseline)
                self.assertEqual(after, baseline)  # exact state, NULL stays NULL, nothing else removed
                can_login = during is None or ("PUBLIC", "CONNECT") in during or ("chatbot_bad", "CONNECT") in during
                self.assertTrue(can_login)
        self.assertIsNone(self._model_probe_login(None)[0])  # NULL is never written
        revoked = baselines["explicit, PUBLIC CONNECT revoked"]
        self.assertEqual(self._model_probe_login(revoked)[0] - revoked, {("chatbot_bad", "CONNECT")})

    def test_probe_role_login_grant_is_guarded_tracked_and_revoked_before_the_role_is_dropped(self):
        source = Path(__file__).read_text(encoding="utf-8")
        body = source[source.index("def test_isolation_check_fails_for_an_" + "overprivileged_role") :]
        body = body[: body.index("    def assert_permission_denied")]
        guard = body.index("has_database_privilege('chatbot_bad', current_database(), 'CONNECT')")
        grant = body.index("GRANT CONNECT ON DATABASE {} TO chatbot_bad")
        revoke = body.index("REVOKE CONNECT ON DATABASE {} FROM chatbot_bad")
        drop_role = body.index('"DROP ROLE chatbot_bad"')
        self.assertLess(guard, grant)                    # grant only when the role cannot connect already
        self.assertLess(grant, revoke)                   # the revoke is registered by the grant's own branch
        self.assertEqual(body.count("CONNECT ON DATABASE"), 2)
        self.assertLess(drop_role, revoke)               # cleanups run last-in first: REVOKE before DROP ROLE
        self.assertNotIn("PUBLIC", body[grant - 200 : revoke + 200].replace("PUBLIC's", ""))  # never touches PUBLIC's entry
        self.assertNotIn("ALTER DATABASE", body)

    def test_verification_is_read_only_and_checks_effective_privileges(self):
        statements = [raw.stmt for raw in parse_sql(VERIFICATION_SQL.read_text(encoding="utf-8"))]
        self.assertGreaterEqual(len(statements), 15)
        for stmt in statements:
            self.assertIsInstance(stmt, A.SelectStmt)
            self.assertIsNone(stmt.intoClause)
            self.assertFalse(stmt.lockingClause)
        text = _executable(VERIFICATION_SQL)
        for needle in (
            "has_table_privilege", "has_any_column_privilege", "has_schema_privilege",
            "has_database_privilege", "pg_has_role", "datacl", "pg_db_role_setting", "shobj_description", "set_option",
        ):
            with self.subTest(needle=needle):
                self.assertIn(needle, text)


class FakeCursor:
    def __init__(self, row):
        self._row = row

    def fetchone(self):
        return self._row

    def fetchall(self):
        return self._row if isinstance(self._row, list) else [self._row]


class FakeConn:
    """Scripted stand-in for a psycopg connection; records every statement executed."""

    def __init__(self, role_row=(False, False, False, False, False), rollup=0):
        self.statements = []
        self.role_row = role_row
        self.rollup = rollup
        self.read_only = False
        self.closed = False

    def execute(self, sql, params=None):
        self.statements.append(sql)
        if "FROM pg_roles WHERE rolname = current_user" in sql and "rolsuper" in sql:
            return FakeCursor(self.role_row)
        if "default_transaction_read_only" in sql:
            return FakeCursor(("on",))
        if "statement_timeout" in sql:
            return FakeCursor(("3s",))
        if "relkind NOT IN ('i','I','t','c')" in sql:
            return FakeCursor([(v, "v", True, False) for v in catalog.VIEWS])
        return FakeCursor((self.rollup,))

    def rollback(self):
        pass

    def close(self):
        self.closed = True

    def cursor(self):
        raise AssertionError("model SQL must never be executed on a connection that failed isolation")


ENV_ON = {"CHATBOT_SQL_ENABLED": "1", "CHATBOT_DB_URL": "postgresql://chatbot_ro@db.example.invalid/x"}


class ExecutorUnitTests(SimpleTestCase):
    def setUp(self):
        executor._isolation_verified.clear()
        cache.clear()

    def test_disabled_by_default_and_never_connects(self):
        with mock.patch.dict(os.environ, {}, clear=False), mock.patch.object(psycopg, "connect") as connect:
            os.environ.pop("CHATBOT_SQL_ENABLED", None)
            os.environ.pop("CHATBOT_DB_URL", None)
            result = executor.run_sql("SELECT name FROM v_departments", user_id=1)
        self.assertFalse(result.ok)
        self.assertEqual(result.error_code, "disabled")
        connect.assert_not_called()

    def test_flag_without_url_or_url_without_flag_stays_disabled(self):
        for env in ({"CHATBOT_SQL_ENABLED": "1"}, {"CHATBOT_DB_URL": ENV_ON["CHATBOT_DB_URL"]},
                    {"CHATBOT_SQL_ENABLED": "0", "CHATBOT_DB_URL": ENV_ON["CHATBOT_DB_URL"]}):
            with self.subTest(env=env), mock.patch.dict(os.environ, env), mock.patch.object(psycopg, "connect") as connect:
                if "CHATBOT_DB_URL" not in env:
                    os.environ.pop("CHATBOT_DB_URL", None)
                if "CHATBOT_SQL_ENABLED" not in env:
                    os.environ.pop("CHATBOT_SQL_ENABLED", None)
                self.assertEqual(executor.run_sql("SELECT name FROM v_departments", user_id=1).error_code, "disabled")
                connect.assert_not_called()

    def test_refuses_the_django_application_role(self):
        from django.conf import settings

        app_user = settings.DATABASES["default"]["USER"]
        env = {"CHATBOT_SQL_ENABLED": "1", "CHATBOT_DB_URL": f"postgresql://{app_user}@db.example.invalid/x"}
        with mock.patch.dict(os.environ, env), mock.patch.object(psycopg, "connect") as connect:
            result = executor.run_sql("SELECT name FROM v_departments", user_id=1)
        self.assertEqual(result.error_code, "isolation_failed")
        connect.assert_not_called()

    def test_rejected_sql_never_connects_and_message_is_sanitized(self):
        with mock.patch.dict(os.environ, ENV_ON), mock.patch.object(psycopg, "connect") as connect:
            result = executor.run_sql("SELECT email FROM public.accounts_user", user_id=1)
        self.assertEqual(result.error_code, "rejected")
        self.assertEqual(result.reason, "unapproved_relation")
        self.assertNotIn("accounts_user", result.error_message)
        self.assertNotIn("email", result.error_message)
        connect.assert_not_called()

    def test_connection_errors_are_sanitized(self):
        err = psycopg.OperationalError("connection to server at 10.1.2.3 password=hunter2 failed")
        with mock.patch.dict(os.environ, ENV_ON), mock.patch.object(psycopg, "connect", side_effect=err) as connect:
            result = executor.run_sql("SELECT name FROM v_departments", user_id=1)
        self.assertEqual(result.error_code, "unavailable")
        for secret in ("hunter2", "10.1.2.3", "password", "db.example.invalid", "chatbot_ro"):
            self.assertNotIn(secret, result.error_message)
        self.assertEqual(connect.call_args.args[0], ENV_ON["CHATBOT_DB_URL"])  # used the dedicated URL

    def test_failed_isolation_blocks_execution(self):
        conn = FakeConn(role_row=(True, False, False, False, False))  # pretend rolsuper = true
        with mock.patch.dict(os.environ, ENV_ON), mock.patch.object(psycopg, "connect", return_value=conn):
            result = executor.run_sql("SELECT name FROM v_departments", user_id=1)
        self.assertEqual(result.error_code, "isolation_failed")
        self.assertTrue(conn.closed)
        self.assertFalse(any("v_departments" in s for s in conn.statements))
        self.assertIn("role_has_elevated_attributes", executor.verify_isolation(FakeConn(role_row=(True,) * 5)))

    def test_executor_does_not_use_the_django_database_connection(self):
        source = Path(executor.__file__).read_text(encoding="utf-8")
        self.assertNotRegex(source, r"(?m)^\s*(from|import)\s+django\.db\b")
        self.assertNotIn("connections[", source)
        self.assertNotIn("connection.cursor", source)
        guard_source = (Path(executor.__file__).parent / "sql_guard.py").read_text(encoding="utf-8")
        self.assertNotRegex(guard_source, r"(?m)^\s*(from|import)\s+(django\.db|psycopg)\b")

    def test_aggregate_budget_limits_repeated_queries(self):
        sql = "SELECT category, count(*) FROM v_market_listings GROUP BY category HAVING count(*) >= 3"
        with mock.patch.object(catalog, "AGGREGATE_QUERIES_PER_HOUR", 2):
            self.assertTrue(executor._budget_ok(7))
            self.assertTrue(executor._budget_ok(7))
            self.assertFalse(executor._budget_ok(7))
            self.assertTrue(executor._budget_ok(8))  # other users unaffected
        with mock.patch.dict(os.environ, ENV_ON), mock.patch.object(psycopg, "connect") as connect, \
                mock.patch.object(catalog, "AGGREGATE_QUERIES_PER_HOUR", 0):
            self.assertEqual(executor.run_sql(sql, user_id=9).error_code, "rate_limited")
            connect.assert_not_called()

    def test_byte_cap_boundary_is_exact(self):
        fetched = [
            (f"row-{i:02d}-" + "x" * (i % 9), i, Decimal(i) / 7, datetime(2026, 1, 1 + i % 28, 12, 30))
            for i in range(40)
        ]
        safe = [[executor._json_safe(v) for v in row] for row in fetched]
        sizes = [len(json.dumps(safe[:k])) for k in range(1, len(safe) + 1)]  # serialized size of the first k rows
        for k in range(1, len(fetched) + 1):
            with self.subTest(k=k):
                kept, truncated = executor._fit_rows(fetched, 50, sizes[k - 1])  # cap == size: row k still fits
                self.assertEqual(len(kept), k)
                self.assertEqual(len(json.dumps(kept)), sizes[k - 1])
                self.assertEqual(truncated, k < len(fetched))
                kept_less, truncated = executor._fit_rows(fetched, 50, sizes[k - 1] - 1)  # one byte less: row k is dropped
                self.assertEqual(len(kept_less), k - 1)
                self.assertTrue(truncated)
                if kept_less:
                    self.assertLessEqual(len(json.dumps(kept_less)), sizes[k - 1] - 1)
        kept, truncated = executor._fit_rows(fetched, 10, 10**6)  # row cap wins when bytes are plentiful
        self.assertEqual((len(kept), truncated), (10, True))
        self.assertEqual(executor._fit_rows(fetched, 50, 5), ([], True))  # even the first row does not fit


DISPOSABLE_MARKER = "FELLOO-DISPOSABLE-LOCAL"  # COMMENT ON DATABASE <name> IS '...' on the disposable instance
SQLSTATE_PERMISSION_DENIED = "42501"  # insufficient_privilege


def _validate_disposable_dsn(dsn):
    """Static checks, no connection. Returns a list of problems; an empty list means acceptable."""
    try:
        parts = conninfo_to_dict(dsn)
    except Exception:
        return ["the DSN cannot be parsed"]
    problems = []
    if (parts.get("host") or "") not in ("127.0.0.1", "::1"):
        problems.append(
            "host must be the literal loopback address 127.0.0.1 or ::1 "
            "(host names, other addresses, host lists and unix sockets are refused)"
        )
    if parts.get("hostaddr"):
        problems.append("hostaddr must not be set")
    port = parts.get("port") or ""
    if not port.isdigit():
        problems.append("port must be given explicitly as a number")
    elif int(port) in (5432, 6432) or not 1024 <= int(port) <= 65535:
        problems.append("port must be an unprivileged non-default port (not 5432 or 6432)")
    if not re.fullmatch(r"felloo_(scratch|test)[a-z0-9_]*", parts.get("dbname") or ""):
        problems.append("database name must match felloo_scratch* or felloo_test*")
    return problems


_DISPOSABLE_SERVER_SQL = """
    SELECT host(inet_server_addr()), inet_server_port(), current_database(),
           (SELECT shobj_description(d.oid, 'pg_database') FROM pg_database AS d WHERE d.datname = current_database()),
           current_setting('neon.timeline_id', true)
"""


def _check_disposable_server(conn, dsn):
    """Ask the server who it is (read-only). Returns a list of problems; empty means acceptable."""
    expected = conninfo_to_dict(dsn)
    address, port, dbname, comment, neon_setting = conn.execute(_DISPOSABLE_SERVER_SQL).fetchone()
    problems = []
    if address not in ("127.0.0.1", "::1"):
        problems.append("the server reports a non-loopback address (or a unix socket)")
    if str(port) != str(expected.get("port")):
        problems.append("the server port differs from the DSN port")
    if dbname != expected.get("dbname"):
        problems.append("the server database differs from the DSN database")
    if comment != DISPOSABLE_MARKER:
        problems.append("the database lacks the disposable-instance marker comment")
    if neon_setting:
        problems.append("the server exposes a Neon-only setting")
    return problems


CHATBOT_DSN = os.environ.get("CHATBOT_TEST_DSN", "")
OWNER_DSN = os.environ.get("CHATBOT_TEST_OWNER_DSN", "")


def _owner_role():
    """The owner role named in the configured owner DSN ('' if unset or unparseable, which setUpClass then refuses)."""
    try:
        return conninfo_to_dict(OWNER_DSN).get("user", "") if OWNER_DSN else ""
    except Exception:
        return ""


OWNER_ROLE = _owner_role()
SKIP_REASON = (
    "Needs a disposable local PostgreSQL where docs/ai_chatbot_phase_2_provisioning.sql has been applied: "
    "set CHATBOT_TEST_DSN (chatbot_ro) and CHATBOT_TEST_OWNER_DSN (owner), both on a literal loopback "
    "address with an explicit port, in a database named felloo_scratch* / felloo_test* that carries the "
    "marker comment FELLOO-DISPOSABLE-LOCAL."
)

MARK = "ZZ-PRIVATE-MARKER"

# Every row these tests create can be recognised by its predicate, which is how they (and only
# they) are deleted. A table whose predicate is "false" is never seeded and must be empty.
# Children come before parents, so the rows can be deleted in this order.
FIXTURES = (
    ("resource_sharing_resourcelisting", f"title LIKE '{MARK}-title-%'"),
    ("resource_sharing_publicresourcerequest", "false"),
    ("lost_and_found_lostandfounditem", f"title LIKE '{MARK}-lf-title%'"),
    ("library_libraryproject", f"title LIKE '{MARK}-proj%'"),
    ("library_note", "false"),
    ("peer_tutoring_tutorprofile", f"headline LIKE '{MARK}-headline%'"),
    ("peer_tutoring_academiccourse", "code LIKE 'ZZIT-%'"),
    ("peer_tutoring_skilltopic", "name LIKE 'ZZ-IT-%'"),
    ("notifications_campusnotification", "category = 'zz-it-fixture'"),
    ("accounts_user", "email LIKE 'chatbot-it-%@lgu.edu.pk'"),
    ("common_department", "short_name LIKE 'ZZIT%'"),
)


class _RowConn:
    """Stand-in connection whose every query returns one fixed row."""

    def __init__(self, row):
        self.row = row

    def execute(self, sql, params=None):
        return FakeCursor(self.row)


class DisposableGuardTests(SimpleTestCase):
    """Offline: the refusal logic that stands between the integration tests and any real database."""

    @staticmethod
    def dsn(**overrides):
        parts = {"host": "127.0.0.1", "port": "54329", "dbname": "felloo_scratch", "user": "somebody"}
        parts.update(overrides)
        return make_conninfo("", **{k: v for k, v in parts.items() if v is not None})

    def test_accepts_only_an_explicit_loopback_scratch_instance(self):
        for overrides in ({}, {"host": "::1"}, {"dbname": "felloo_test_run2"}, {"port": "54399"}):
            with self.subTest(overrides=overrides):
                self.assertEqual(_validate_disposable_dsn(self.dsn(**overrides)), [])

    def test_refuses_remote_named_or_ambiguous_hosts(self):
        for host in (
            "localhost", "db.example.invalid", "example-pooler.neon.tech", "127.0.0.2", "0.0.0.0",
            "10.0.0.5", "127.0.0.1,db.example.invalid", "/var/run/postgresql", "", None,
        ):
            with self.subTest(host=host):
                self.assertTrue(_validate_disposable_dsn(self.dsn(host=host)))
        self.assertTrue(_validate_disposable_dsn(self.dsn(hostaddr="10.0.0.5")))

    def test_refuses_default_missing_or_invalid_ports(self):
        for port in (None, "", "5432", "6432", "80", "abc", "70000", "-1"):
            with self.subTest(port=port):
                self.assertTrue(_validate_disposable_dsn(self.dsn(port=port)))

    def test_refuses_databases_that_are_not_marked_scratch_or_test(self):
        for dbname in (None, "", "neondb", "postgres", "fyp_dev", "felloo_prod", "scratch", "felloo-scratch",
                       "felloo_scratch; DROP TABLE x", "Felloo_Scratch"):
            with self.subTest(dbname=dbname):
                self.assertTrue(_validate_disposable_dsn(self.dsn(dbname=dbname)))

    def test_unparseable_dsn_is_refused(self):
        self.assertTrue(_validate_disposable_dsn("host=127.0.0.1 port"))

    def test_server_must_confirm_it_is_the_disposable_instance(self):
        good = ("127.0.0.1", 54329, "felloo_scratch", DISPOSABLE_MARKER, None)
        self.assertEqual(_check_disposable_server(_RowConn(good), self.dsn()), [])
        for index, wrong in (
            (0, "10.1.2.3"), (0, None), (1, 5432), (2, "neondb"), (3, None), (3, "something else"), (4, "tl-123"),
        ):
            with self.subTest(index=index, wrong=wrong):
                row = list(good)
                row[index] = wrong
                self.assertTrue(_check_disposable_server(_RowConn(tuple(row)), self.dsn()))

    def test_integration_tests_use_specific_denial_checks_and_scoped_cleanup(self):
        source = Path(__file__).read_text(encoding="utf-8")
        integration = source[source.index("class " + "IntegrationTests") :]
        self.assertNotIn("assertRaises(psycopg." + "Error)", integration)  # any error used to count as "denied"
        self.assertNotIn("app" + "_owner", integration)  # the owner role comes from the configured DSN
        self.assertIn("SQLSTATE_PERMISSION_DENIED", integration)
        deletes = re.findall(r"DELETE FROM[^\n]*", integration)
        self.assertGreaterEqual(len(deletes), 1)
        for statement in deletes:
            self.assertIn("WHERE", statement)  # never an unconditional delete
        self.assertIn("refuse_unexpected_data", integration)
        self.assertIn("_check_disposable_server", integration)

    def test_negative_privilege_test_never_grants_or_revokes_on_application_tables(self):
        # Regression: the over-privileged-role test once ran GRANT/REVOKE on accounts_user, which left
        # an explicit owner-only ACL on a real table. Only the throwaway probe table may be a target.
        source = Path(__file__).read_text(encoding="utf-8")
        integration = source[source.index("class " + "IntegrationTests") :]
        grants = [line.strip() for line in integration.splitlines() if re.search(r"\b(GRANT|REVOKE)\b.*\bON\b", line)]
        self.assertTrue(grants)  # the probe-table grant must exist, or the test proves nothing
        for line in grants:
            if "CONNECT ON DATABASE" in line:  # the guarded temporary login grant for chatbot_bad only
                self.assertRegex(line, r'(TO|FROM) chatbot_bad"')
                continue
            self.assertIn("{PROBE_TABLE}", line, msg=line)  # never an application table
        self.assertNotIn("accounts_user TO", integration)
        self.assertNotIn("accounts_user FROM", integration)
        self.assertNotIn("DROP ROLE chatbot_bad; END", integration)  # no blanket role cleanup
        self.assertEqual(integration.count("CREATE TABLE {PROBE_TABLE}"), 1)  # plain CREATE: fails if the name exists
        self.assertIn("DROP TABLE {PROBE_TABLE}", integration)


PROBE_TABLE = "public.chatbot_probe_tbl"  # throwaway table for the over-privileged-role test


@unittest.skipUnless(CHATBOT_DSN and OWNER_DSN, SKIP_REASON)
class IntegrationTests(SimpleTestCase):
    """Run against a real, provisioned, disposable local database. Seeds and removes only its own rows."""

    @classmethod
    def setUpClass(cls):
        super().setUpClass()
        problems = [f"chatbot DSN: {p}" for p in _validate_disposable_dsn(CHATBOT_DSN)]
        problems += [f"owner DSN: {p}" for p in _validate_disposable_dsn(OWNER_DSN)]
        chatbot_parts, owner_parts = conninfo_to_dict(CHATBOT_DSN), conninfo_to_dict(OWNER_DSN)
        problems += [f"the two DSNs disagree on {key}" for key in ("host", "port", "dbname") if chatbot_parts.get(key) != owner_parts.get(key)]
        if not re.fullmatch(r"[A-Za-z_][A-Za-z0-9_]*", OWNER_ROLE):
            problems.append("the owner DSN must name a simple user")
        if problems:
            raise AssertionError("Refusing to run: not an explicit disposable local instance: " + "; ".join(problems))
        cls.owner = psycopg.connect(OWNER_DSN, autocommit=True)
        try:
            problems = _check_disposable_server(cls.owner, OWNER_DSN)
            if problems:
                raise AssertionError("Refusing to run: the server does not identify as the disposable instance: " + "; ".join(problems))
            cls.refuse_unexpected_data()
        except BaseException:
            cls.owner.close()
            raise
        try:
            cls.cleanup_fixtures()  # leftovers of an earlier, interrupted run of these same tests
            cls.seed()
        except BaseException:
            try:
                cls.cleanup_fixtures()
            finally:
                cls.owner.close()
            raise

    @classmethod
    def tearDownClass(cls):
        try:
            cls.cleanup_fixtures()
        finally:
            cls.owner.close()
            super().tearDownClass()

    @classmethod
    def x(cls, sql, *args):
        return cls.owner.execute(sql, args or None)

    @classmethod
    def refuse_unexpected_data(cls):
        """Abort, changing nothing, if any table holds a row these tests did not create."""
        unexpected = []
        for table, predicate in FIXTURES:
            fixture, total = cls.x(f"SELECT count(*) FILTER (WHERE {predicate}), count(*) FROM {table}").fetchone()
            if total != fixture:
                unexpected.append(f"{table}: {total - fixture} row(s) not created by these tests")
        # Objects the negative privilege test creates. If they already exist they are not ours:
        # refuse instead of dropping or reusing them.
        for label, exists_sql in (
            ("role chatbot_bad", "SELECT EXISTS (SELECT FROM pg_roles WHERE rolname = 'chatbot_bad')"),
            (f"table {PROBE_TABLE}", f"SELECT to_regclass('{PROBE_TABLE}') IS NOT NULL"),
        ):
            if cls.x(exists_sql).fetchone()[0]:
                unexpected.append(f"{label} already exists")
        if unexpected:
            raise AssertionError(
                "Refusing to run: the database holds data these tests did not create (nothing was changed): "
                + "; ".join(unexpected)
            )

    @classmethod
    def cleanup_fixtures(cls):
        """Delete only rows matching a fixture predicate, then prove none are left."""
        for table, predicate in FIXTURES:
            if predicate != "false":
                cls.x(f"DELETE FROM {table} WHERE {predicate}")
        leftovers = []
        for table, predicate in FIXTURES:
            if cls.x(f"SELECT count(*) FILTER (WHERE {predicate}) FROM {table}").fetchone()[0]:
                leftovers.append(table)
        if leftovers:
            raise AssertionError("fixture rows could not be removed from: " + ", ".join(leftovers))

    @classmethod
    def seed(cls):
        cls.x("INSERT INTO common_department (name, short_name) VALUES ('ZZ IT Alpha','ZZITA'), ('ZZ IT Beta','ZZITB')")
        # A database built from this repo's migrations still carries legacy NOT NULL columns on
        # accounts_user that live Neon does not have (accounts/0003 is state-only); fill whichever are required.
        legacy = [
            r[0] for r in cls.x(
                "SELECT column_name FROM information_schema.columns WHERE table_name = 'accounts_user' "
                "AND column_name IN ('full_name', 'department') AND is_nullable = 'NO'"
            ).fetchall()
        ]
        cls.x(
            "INSERT INTO accounts_user (password,is_superuser,email,role,is_email_verified,is_active,is_staff,created_at,updated_at"
            + "".join(f",{c}" for c in legacy) + ") "
            "SELECT 'x', false, 'chatbot-it-'||g||'@lgu.edu.pk', 'student', true, true, false, now(), now()"
            + ", 'x'" * len(legacy) + " FROM generate_series(1,6) g"
        )
        cls.x(
            "INSERT INTO resource_sharing_resourcelisting (title,category,course,condition,exchange_type,price,description,status,created_at,updated_at,owner_id) "
            "SELECT %s||g, CASE WHEN g<=4 THEN 'books' ELSE 'notes' END, %s, 'used', 'free', NULL, %s, "
            "CASE WHEN g=6 THEN 'unavailable' ELSE 'active' END, now(), now(), (SELECT min(id) FROM accounts_user WHERE email LIKE 'chatbot-it-%%') "
            "FROM generate_series(1,6) g",
            MARK + "-title-", MARK + "-course", MARK + "-description",
        )
        cls.x(
            "INSERT INTO lost_and_found_lostandfounditem (post_type,title,category,location,description,status,created_at,updated_at,poster_id) "
            "SELECT 'lost', %s, 'keys', %s, %s, CASE WHEN g=4 THEN 'resolved' ELSE 'open' END, now(), now(), (SELECT min(id) FROM accounts_user WHERE email LIKE 'chatbot-it-%%') "
            "FROM generate_series(1,4) g",
            MARK + "-lf-title", MARK + "-lf-location", MARK + "-lf-description",
        )
        cls.x(
            "INSERT INTO library_libraryproject (title,abstract,status,created_at,author_id,department_id,github_link,level) "
            "SELECT %s, %s, CASE WHEN g=3 THEN 'pending' ELSE 'approved' END, now(), (SELECT min(id) FROM accounts_user WHERE email LIKE 'chatbot-it-%%'), "
            "(SELECT id FROM common_department WHERE short_name='ZZITA'), %s, 'fyp' FROM generate_series(1,3) g",
            MARK + "-proj", MARK + "-abstract", "https://example.invalid/" + MARK,
        )
        cls.x(
            "INSERT INTO peer_tutoring_tutorprofile (profile_type,headline,bio,subjects,skills,availability,is_free,hourly_fee,average_rating,total_reviews,is_active,created_at,updated_at,user_id) "
            "SELECT 'tutor', %s, %s, to_jsonb(%s::text), to_jsonb(%s::text), %s, true, NULL, 4.50, 3, g<>5, now(), now(), u.id "
            "FROM (SELECT id, row_number() OVER (ORDER BY id) g FROM accounts_user WHERE email LIKE 'chatbot-it-%%') u",
            MARK + "-headline", MARK + "-bio", MARK + "-subjects", MARK + "-skills", MARK + "-availability",
        )
        cls.x(
            "INSERT INTO notifications_campusnotification (id,title,message,category,priority,created_at,is_active,target_user_id) "
            "SELECT gen_random_uuid(), 'Broadcast '||g, %s, 'zz-it-fixture', 'normal', now(), g<>2, "
            "CASE WHEN g=3 THEN (SELECT min(id) FROM accounts_user WHERE email LIKE 'chatbot-it-%%') END FROM generate_series(1,60) g",
            MARK + "-announcement-message",
        )
        cls.x(
            "INSERT INTO peer_tutoring_academiccourse (code,title,department_id,description,is_active,created_at) "
            "VALUES ('ZZIT-101','Intro', (SELECT id FROM common_department WHERE short_name='ZZITA'), %s, true, now())",
            MARK + "-course-description",
        )
        cls.x("INSERT INTO peer_tutoring_skilltopic (name,category,is_active,created_at) VALUES ('ZZ-IT-Python','zz-it',true,now())")

    def chatbot_conn(self):
        conn = psycopg.connect(CHATBOT_DSN)
        self.addCleanup(conn.close)
        return conn

    def setUp(self):
        executor._isolation_verified.clear()
        cache.clear()
        patcher = mock.patch.dict(os.environ, {"CHATBOT_SQL_ENABLED": "1", "CHATBOT_DB_URL": CHATBOT_DSN})
        patcher.start()
        self.addCleanup(patcher.stop)

    # ---- isolation -----------------------------------------------------------------
    def test_isolation_check_passes_for_the_provisioned_role(self):
        self.assertEqual(executor.verify_isolation(self.chatbot_conn()), [])

    def test_isolation_check_fails_for_an_overprivileged_role(self):
        # Both statements fail if the names already exist (fail closed). Each cleanup is registered
        # only after its object was created, so only objects made here are ever dropped. The
        # grant targets a throwaway table, never an application table, so no application ACL changes.
        self.x("CREATE ROLE chatbot_bad LOGIN")
        self.addCleanup(self.x, "DROP ROLE chatbot_bad")
        self.x(f"CREATE TABLE {PROBE_TABLE} (a int)")
        self.addCleanup(self.x, f"DROP TABLE {PROBE_TABLE}")  # runs first: removes the grant with the table
        self.x(f"GRANT SELECT ON {PROBE_TABLE} TO chatbot_bad")
        # When PUBLIC's CONNECT has been revoked the new role cannot even log in. Grant CONNECT only
        # in that case, and register its REVOKE only when the grant was made here (it runs before
        # DROP ROLE, which would otherwise fail on the leftover privilege). On a NULL or PUBLIC-CONNECT
        # database ACL nothing is written, so the database ACL keeps its NULL/explicit state.
        if not self.x("SELECT has_database_privilege('chatbot_bad', current_database(), 'CONNECT')").fetchone()[0]:
            database = self.x("SELECT current_database()").fetchone()[0]
            self.x(pgsql.SQL("GRANT CONNECT ON DATABASE {} TO chatbot_bad").format(pgsql.Identifier(database)))
            self.addCleanup(self.x, pgsql.SQL("REVOKE CONNECT ON DATABASE {} FROM chatbot_bad").format(pgsql.Identifier(database)))
        conn = psycopg.connect(make_conninfo(CHATBOT_DSN, user="chatbot_bad"))
        self.addCleanup(conn.close)
        failures = executor.verify_isolation(conn)
        self.assertIn("role_can_access_non_chatbot_objects", failures)
        self.assertIn("chatbot_view_privileges_wrong", failures)

    def assert_permission_denied(self, conn, sql):
        """The statement must fail with SQLSTATE 42501 (insufficient_privilege). Success, or any other
        error (a typo, a missing object, a syntax error), fails the test."""
        try:
            conn.execute(sql)
        except psycopg.Error as exc:
            conn.rollback()
            self.assertEqual(
                exc.sqlstate,
                SQLSTATE_PERMISSION_DENIED,
                f"expected permission denied but got {exc.sqlstate} ({type(exc).__name__}) for: {sql}",
            )
        else:
            conn.rollback()
            self.fail(f"statement unexpectedly succeeded: {sql}")

    def test_role_cannot_read_or_write_base_tables_or_change_schema(self):
        conn = self.chatbot_conn()
        # The role's default is a READ ONLY transaction, which makes PostgreSQL refuse writes with
        # 25006 before it ever looks at privileges. Turn that off for this connection so that every
        # statement below is refused by the PRIVILEGE layer (42501). The setting must outlive each
        # statement, hence autocommit.
        conn.autocommit = True
        conn.execute("SET default_transaction_read_only = off")
        self.assertEqual(conn.execute("SHOW default_transaction_read_only").fetchone()[0], "off")
        denied = [
            "SELECT * FROM public.accounts_user",
            "SELECT email FROM public.accounts_studentroster",
            "SELECT * FROM public.resource_sharing_resourcelisting",
            "SELECT title FROM public.library_libraryproject",
            "SELECT * FROM public.printing_printrequest",
            "SELECT * FROM public.django_session",
            "INSERT INTO public.common_department (name, short_name) VALUES ('x','y')",
            "UPDATE public.common_department SET name = 'x'",
            "DELETE FROM public.common_department WHERE false",
            "TRUNCATE public.common_department",
            "CREATE TABLE public.leak (a int)",
            "CREATE TABLE chatbot.leak (a int)",
            "CREATE SCHEMA leak",
            "CREATE VIEW chatbot.leak AS SELECT 1",
            "DROP VIEW chatbot.v_departments",
            "ALTER VIEW chatbot.v_departments RENAME TO x",
            "CREATE ROLE sneaky",
            "ALTER ROLE chatbot_ro SUPERUSER",
            f"SET ROLE {OWNER_ROLE}",  # the owner role named in the configured owner DSN
            "SELECT * FROM pg_authid",
            "SELECT passwd FROM pg_shadow",
            "INSERT INTO chatbot.v_departments (name, short_name) VALUES ('x','y')",
            "UPDATE chatbot.v_departments SET name = 'x'",
        ]
        for sql in denied:
            with self.subTest(sql=sql):
                self.assert_permission_denied(conn, sql)

    def test_default_read_only_transaction_blocks_writes_before_privileges(self):
        """The second layer, asserted precisely: in a default session writes fail with 25006."""
        conn = self.chatbot_conn()
        self.assertEqual(conn.execute("SHOW default_transaction_read_only").fetchone()[0], "on")
        conn.rollback()
        for sql in (
            "INSERT INTO public.common_department (name, short_name) VALUES ('x','y')",
            "UPDATE public.common_department SET name = 'x'",
            "CREATE TABLE public.leak (a int)",
            "CREATE ROLE sneaky",
        ):
            with self.subTest(sql=sql):
                with self.assertRaises(pg_errors.ReadOnlySqlTransaction):
                    conn.execute(sql)
                conn.rollback()

    def test_turning_off_read_only_does_not_grant_write_access(self):
        conn = self.chatbot_conn()
        conn.execute("SET default_transaction_read_only = off")
        with self.assertRaises(pg_errors.InsufficientPrivilege):
            conn.execute("INSERT INTO chatbot.v_departments (name, short_name) VALUES ('x','y')")
        conn.rollback()

    def test_database_level_timeout_is_enforced(self):
        conn = self.chatbot_conn()
        with self.assertRaises(pg_errors.QueryCanceled):
            conn.execute("SELECT pg_sleep(6)")  # raw connection on purpose: bypasses the guard
        conn.rollback()
        self.assertEqual(conn.execute("SHOW statement_timeout").fetchone()[0], "3s")

    # ---- view definitions, visibility and leakage ------------------------------------
    def test_catalog_matches_the_real_views(self):
        conn = self.chatbot_conn()
        rows = conn.execute(
            "SELECT table_name, column_name FROM information_schema.columns WHERE table_schema = 'chatbot'"
        ).fetchall()
        actual = {}
        for table, column in rows:
            actual.setdefault(table, set()).add(column)
        self.assertEqual(actual, {name: set(v.columns) for name, v in catalog.VIEWS.items()})

    def test_views_apply_the_documented_visibility_filters(self):
        conn = self.chatbot_conn()
        count = lambda view: conn.execute(f"SELECT count(*) FROM chatbot.{view}").fetchone()[0]
        self.assertEqual(count("v_market_listings"), 5)      # 6 seeded, 1 unavailable
        self.assertEqual(count("v_lost_found_open"), 3)      # 4 seeded, 1 resolved
        self.assertEqual(count("v_library_projects"), 2)     # 3 seeded, 1 pending
        self.assertEqual(count("v_tutors"), 5)               # 6 seeded, 1 inactive
        self.assertEqual(count("v_announcements"), 58)       # 60 seeded, 1 inactive, 1 targeted
        self.assertEqual(count("v_courses"), 1)
        self.assertEqual(count("v_skill_topics"), 1)

    def test_no_private_or_free_text_value_appears_in_any_view(self):
        conn = self.chatbot_conn()
        for view, definition in catalog.VIEWS.items():
            cols = ", ".join(sorted(definition.columns))
            for row in conn.execute(f"SELECT {cols} FROM chatbot.{view}").fetchall():
                for value in row:
                    with self.subTest(view=view):
                        self.assertNotIn(MARK, str(value))
                        self.assertNotIn("chatbot-it-", str(value))
                        self.assertNotIn("@", str(value))

    def test_every_view_is_a_security_barrier_view(self):
        conn = self.chatbot_conn()
        rows = conn.execute(
            "SELECT c.relname, c.reloptions FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace "
            "WHERE n.nspname = 'chatbot' AND c.relkind = 'v'"
        ).fetchall()
        self.assertEqual({r[0] for r in rows}, set(catalog.VIEWS))
        for name, options in rows:
            with self.subTest(view=name):
                self.assertIn("security_barrier=true", options or [])

    # ---- end to end through the executor ---------------------------------------------
    def test_run_sql_returns_rows_for_an_approved_query(self):
        result = executor.run_sql("SELECT category, exchange_type FROM v_market_listings ORDER BY id LIMIT 3", user_id=1)
        self.assertTrue(result.ok, result)
        self.assertEqual(result.columns, ("category", "exchange_type"))
        self.assertEqual(len(result.rows), 3)
        self.assertFalse(result.truncated)

    def test_small_groups_are_never_returned(self):
        sql = "SELECT category, count(*) AS n FROM v_market_listings GROUP BY category HAVING count(*) >= 3"
        result = executor.run_sql(sql, user_id=1)
        self.assertTrue(result.ok, result)
        self.assertEqual(result.rows, (("books", 4),))  # 'notes' has one active row: suppressed
        none_left = executor.run_sql(
            "SELECT category, count(*) FROM v_market_listings GROUP BY category HAVING count(*) >= 10", user_id=1
        )
        self.assertEqual(none_left.rows, ())

    def test_row_limit_is_enforced(self):
        result = executor.run_sql("SELECT title FROM v_announcements LIMIT 50", user_id=1)
        self.assertTrue(result.ok, result)
        self.assertLessEqual(len(result.rows), catalog.MAX_ROWS)
        # no LIMIT in the SQL: the executor still caps at MAX_ROWS and says so
        capped = executor.run_sql("SELECT category FROM v_announcements", user_id=1)
        self.assertTrue(capped.ok, capped)
        self.assertLessEqual(len(capped.rows), catalog.MAX_ROWS)
        self.assertTrue(capped.truncated)

    def test_response_size_limit_is_enforced_at_the_exact_boundary(self):
        sql = "SELECT title FROM v_announcements ORDER BY title"
        everything = executor.run_sql(sql, user_id=1)  # production caps: at most 50 rows, far below 16 KB
        self.assertTrue(everything.ok, everything)
        all_rows = [list(r) for r in everything.rows]
        self.assertEqual(len(all_rows), catalog.MAX_ROWS)
        sizes = [len(json.dumps(all_rows[:k])) for k in range(1, len(all_rows) + 1)]
        for k in (1, 5, 17, 30, 50):
            for cap, expected in ((sizes[k - 1], k), (sizes[k - 1] - 1, k - 1)):  # exactly fits / one byte too small
                with self.subTest(k=k, cap=cap), mock.patch.object(catalog, "MAX_RESPONSE_BYTES", cap):
                    result = executor.run_sql(sql, user_id=1)
                    self.assertTrue(result.ok, result)
                    self.assertEqual(len(result.rows), expected)
                    self.assertEqual(result.rows, tuple(tuple(r) for r in all_rows[:expected]))
                    self.assertTrue(result.truncated)  # 58 announcements exist, so something was always cut
                    if expected:
                        self.assertLessEqual(len(json.dumps(result.rows)), cap)

    def test_announcement_message_is_not_readable_even_by_the_database_role(self):
        conn = self.chatbot_conn()
        with self.assertRaises(pg_errors.UndefinedColumn):
            conn.execute("SELECT message FROM chatbot.v_announcements")
        conn.rollback()
        with self.assertRaises(pg_errors.InsufficientPrivilege):
            conn.execute("SELECT message FROM public.notifications_campusnotification")
        conn.rollback()
        self.assertEqual(executor.run_sql("SELECT message FROM v_announcements", user_id=1).reason, "unapproved_column")

    def test_database_errors_are_sanitized(self):
        bad = executor.run_sql("SELECT category::int4 FROM v_market_listings", user_id=1)  # invalid cast of 'books'
        self.assertFalse(bad.ok)
        self.assertEqual(bad.error_code, "db_error")
        for leak in ("invalid input", "category", "v_market_listings", "integer", "chatbot", "books", "ERROR", "relation"):
            self.assertNotIn(leak, bad.error_message)

    def test_guard_blocks_generated_writes_and_catalog_reads_end_to_end(self):
        for sql in ("DELETE FROM v_departments WHERE true", "SELECT rolname FROM pg_roles", "SELECT pg_sleep(5) FROM v_tutors",
                    "SELECT id FROM public.accounts_user"):
            with self.subTest(sql=sql):
                result = executor.run_sql(sql, user_id=1)
                self.assertFalse(result.ok)
                self.assertEqual(result.error_code, "rejected")

    def test_repeated_aggregate_queries_are_rate_limited(self):
        sql = "SELECT category, count(*) FROM v_market_listings GROUP BY category HAVING count(*) >= 3"
        with mock.patch.object(catalog, "AGGREGATE_QUERIES_PER_HOUR", 2):
            codes = [executor.run_sql(sql, user_id=42).error_code for _ in range(3)]
        self.assertEqual(codes, ["", "", "rate_limited"])

    def test_executor_refuses_to_run_as_the_owner_role(self):
        owner_env = {"CHATBOT_SQL_ENABLED": "1", "CHATBOT_DB_URL": OWNER_DSN}
        from django.conf import settings

        with mock.patch.dict(os.environ, owner_env), mock.patch.dict(
            settings.DATABASES["default"], {"USER": conninfo_to_dict(OWNER_DSN)["user"]}
        ):
            self.assertEqual(executor.run_sql("SELECT name FROM v_departments", user_id=1).error_code, "isolation_failed")

    def test_owner_role_would_fail_isolation_even_if_misconfigured(self):
        conn = psycopg.connect(OWNER_DSN)
        self.addCleanup(conn.close)
        self.assertTrue(executor.verify_isolation(conn))
