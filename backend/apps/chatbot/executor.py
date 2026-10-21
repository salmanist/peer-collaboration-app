"""Backend-only executor for validated, model-proposed SQL.

DISABLED BY DEFAULT. Execution requires ALL of:
  1. CHATBOT_SQL_ENABLED=1 and CHATBOT_DB_URL set (backend environment only; never mobile,
     source or logs),
  2. the URL's role differs from the Django application's own database role,
  3. verify_isolation() passes on a live connection as that role.
Anything else returns a sanitized "disabled" / "isolation_failed" result and runs nothing.

This module opens its OWN psycopg connection. It never imports django.db, so model-proposed
SQL can never travel over the normal Django connection (a unit test enforces this).

Parameters are intentionally unsupported: validate_sql() only admits constant literals, and
values supplied by the application belong in fixed ORM handlers, not in generated SQL.
"""

import hashlib
import json
import logging
import os
import time
from datetime import date, datetime
from decimal import Decimal
from typing import NamedTuple
from uuid import UUID

import psycopg
from django.conf import settings
from django.core.cache import cache
from psycopg import errors as pg_errors
from psycopg.conninfo import conninfo_to_dict

from . import catalog
from .sql_guard import SqlRejected, validate_sql

logger = logging.getLogger(__name__)

ERROR_MESSAGES = {
    "disabled": "The data assistant is not available right now.",
    "isolation_failed": "The data assistant is not available right now.",
    "rate_limited": "Too many summary queries. Please try again later.",
    "timeout": "The query took too long.",
    "not_permitted": "The query is not permitted.",
    "unavailable": "The data assistant is not available right now.",
    "db_error": "The query could not be completed.",
    "internal_error": "The query could not be completed.",
    "rejected": "The query was rejected.",
}


class SqlResult(NamedTuple):
    ok: bool
    columns: tuple = ()
    rows: tuple = ()
    truncated: bool = False
    error_code: str = ""
    error_message: str = ""
    reason: str = ""  # SqlRejected code when error_code == "rejected"


def _fail(code, message=None, reason=""):
    return SqlResult(False, error_code=code, error_message=message or ERROR_MESSAGES[code], reason=reason)


# ---- gate -------------------------------------------------------------------------------
def sql_enabled():
    flag = os.environ.get("CHATBOT_SQL_ENABLED", "").strip().lower() in ("1", "true", "yes")
    return flag and bool(os.environ.get("CHATBOT_DB_URL"))


def _is_dedicated_role(dsn):
    """The chatbot URL must name a role, and not the Django application's own role."""
    try:
        user = conninfo_to_dict(dsn).get("user")
    except Exception:
        return False
    app_user = settings.DATABASES["default"].get("USER")
    return bool(user) and user != app_user


_ISOLATION_CACHE_SECONDS = 300
_isolation_verified = {}  # sha256(dsn)[:16] -> monotonic time of last pass


def verify_isolation(conn):
    """Return a list of failed check names (empty list = isolated). Runs as the chatbot role.

    Passing proves what this role can do *now*; it does not replace reviewing the grants.
    """
    failures = []

    def one(sql, *args):
        return conn.execute(sql, args).fetchone()

    me = "(SELECT oid FROM pg_roles WHERE rolname = current_user)"

    row = one(
        "SELECT rolsuper, rolbypassrls, rolcreaterole, rolcreatedb, rolreplication "
        "FROM pg_roles WHERE rolname = current_user"
    )
    if row is None or any(row):
        failures.append("role_has_elevated_attributes")

    if one(f"SELECT count(*) FROM pg_auth_members WHERE member = {me}")[0]:
        failures.append("role_is_member_of_other_roles")

    owns = one(
        f"SELECT (SELECT count(*) FROM pg_class WHERE relowner = {me})"
        f" + (SELECT count(*) FROM pg_namespace WHERE nspowner = {me})"
        f" + (SELECT count(*) FROM pg_proc WHERE proowner = {me})"
    )[0]
    if owns:
        failures.append("role_owns_objects")

    # Nothing outside the chatbot schema may be readable/writable (system schemas excluded:
    # catalogs are readable by every role in PostgreSQL and cannot be revoked).
    leaked = one(
        """
        SELECT count(*) FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
        WHERE n.nspname NOT LIKE 'pg\\_%%' AND n.nspname <> 'information_schema'
          AND n.nspname <> %s
          AND ( (c.relkind IN ('r','p','v','m','f') AND (
                   has_table_privilege(current_user, c.oid,
                       'SELECT,INSERT,UPDATE,DELETE,TRUNCATE,REFERENCES,TRIGGER')
                OR has_any_column_privilege(current_user, c.oid, 'SELECT,INSERT,UPDATE,REFERENCES')))
             OR (c.relkind = 'S' AND has_sequence_privilege(current_user, c.oid, 'USAGE,SELECT,UPDATE')) )
        """,
        catalog.SCHEMA,
    )[0]
    if leaked:
        failures.append("role_can_access_non_chatbot_objects")

    objects = conn.execute(
        """
        SELECT c.relname, c.relkind,
               has_table_privilege(current_user, c.oid, 'SELECT'),
               has_table_privilege(current_user, c.oid,
                   'INSERT,UPDATE,DELETE,TRUNCATE,REFERENCES,TRIGGER')
        FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
        WHERE n.nspname = %s AND c.relkind NOT IN ('i','I','t','c')
        """,
        (catalog.SCHEMA,),
    ).fetchall()
    if {o[0] for o in objects} != set(catalog.VIEWS):
        failures.append("chatbot_schema_objects_differ_from_catalog")
    if any(o[1] != "v" or not o[2] or o[3] for o in objects):
        failures.append("chatbot_view_privileges_wrong")

    unsafe_owner = one(
        """
        SELECT count(*) FROM pg_class c
        JOIN pg_namespace n ON n.oid = c.relnamespace AND n.nspname = %s
        JOIN pg_roles r ON r.oid = c.relowner
        WHERE c.relkind = 'v'
          AND (r.rolsuper OR r.rolbypassrls OR r.rolcanlogin OR r.rolname = current_user)
        """,
        catalog.SCHEMA,
    )[0]
    if unsafe_owner:
        failures.append("chatbot_views_have_unsafe_owner")

    can_create = one(
        """
        SELECT (SELECT count(*) FROM pg_namespace n
                WHERE n.nspname NOT LIKE 'pg\\_%%' AND n.nspname <> 'information_schema'
                  AND has_schema_privilege(current_user, n.oid, 'CREATE'))
             + (CASE WHEN has_database_privilege(current_user, current_database(), 'CREATE')
                     THEN 1 ELSE 0 END)
        """
    )[0]
    if can_create:
        failures.append("role_can_create_objects")

    if one("SELECT current_setting('default_transaction_read_only')")[0] != "on":
        failures.append("role_default_not_read_only")
    if one("SELECT current_setting('statement_timeout')")[0] in ("0", "0ms"):
        failures.append("role_has_no_statement_timeout")

    return failures


# ---- execution --------------------------------------------------------------------------
def _json_safe(value):
    if isinstance(value, (Decimal, UUID)):
        return str(value)
    if isinstance(value, (datetime, date)):
        return value.isoformat()
    return value


def _fit_rows(fetched, max_rows, max_bytes):
    """Keep as many leading rows as fit; return (rows, truncated).

    Size is measured as len(json.dumps(rows)) with Python's default separators ("[" + rows
    joined by ", " + "]"), which is an upper bound for compact serializers. A row is kept only
    if the serialized list stays <= max_bytes, so the cap is exact, not approximate.
    """
    truncated = len(fetched) > max_rows
    rows, size = [], 2  # "[]"
    for raw in fetched[:max_rows]:
        row = [_json_safe(v) for v in raw]
        grown = size + len(json.dumps(row, default=str)) + (2 if rows else 0)  # ", " between rows
        if grown > max_bytes:
            truncated = True
            break
        size = grown
        rows.append(row)
    return rows, truncated


def _budget_ok(user_id):
    key = f"chatbot:agg:{user_id}"
    cache.add(key, 0, 3600)
    try:
        return cache.incr(key) <= catalog.AGGREGATE_QUERIES_PER_HOUR
    except ValueError:
        return True  # key expired between add and incr


def _classify(exc):
    if isinstance(exc, pg_errors.QueryCanceled):
        return "timeout"
    if isinstance(exc, pg_errors.InsufficientPrivilege):
        return "not_permitted"
    if isinstance(exc, psycopg.OperationalError):
        return "unavailable"
    if isinstance(exc, psycopg.Error):
        return "db_error"
    return "internal_error"


def _connect(dsn):
    return psycopg.connect(
        dsn,
        connect_timeout=catalog.CONNECT_TIMEOUT_S,
        autocommit=False,
        application_name="felloo-chatbot",
    )


def run_sql(sql, *, user_id):
    """Validate then execute `sql` on the restricted connection. Never raises."""
    if not sql_enabled():
        return _fail("disabled")
    dsn = os.environ["CHATBOT_DB_URL"]
    if not _is_dedicated_role(dsn):
        return _fail("isolation_failed")

    try:
        validated = validate_sql(sql)
    except SqlRejected as rejected:
        return _fail("rejected", rejected.message, rejected.code)

    if validated.is_aggregate and not _budget_ok(user_id):
        return _fail("rate_limited")

    dsn_key = hashlib.sha256(dsn.encode()).hexdigest()[:16]
    sql_key = hashlib.sha256(sql.encode()).hexdigest()[:12]
    conn = None
    try:
        conn = _connect(dsn)
        last_ok = _isolation_verified.get(dsn_key)
        if last_ok is None or time.monotonic() - last_ok > _ISOLATION_CACHE_SECONDS:
            failures = verify_isolation(conn)
            if failures:
                _isolation_verified.pop(dsn_key, None)
                logger.error("chatbot isolation check failed: %s", ",".join(failures))
                return _fail("isolation_failed")
            _isolation_verified[dsn_key] = time.monotonic()
        conn.rollback()  # end the verification transaction before switching to read-only

        conn.read_only = True
        with conn.cursor() as cur:
            cur.execute(f"SET LOCAL statement_timeout = {int(catalog.STATEMENT_TIMEOUT_MS)}")
            cur.execute("SET LOCAL lock_timeout = 1000")
            cur.execute(validated.sql, None)  # no params: values are validated constants
            columns = tuple(d.name for d in cur.description)
            fetched = cur.fetchmany(catalog.MAX_ROWS + 1)
        conn.rollback()
    except Exception as exc:  # sanitized below; raw errors never leave this function
        code = _classify(exc)
        logger.warning(
            "chatbot sql failed user=%s sql=%s code=%s sqlstate=%s",
            user_id, sql_key, code, getattr(exc, "sqlstate", None),
        )
        return _fail(code)
    finally:
        if conn is not None:
            try:
                conn.close()
            except Exception:
                pass

    rows, truncated = _fit_rows(fetched, catalog.MAX_ROWS, catalog.MAX_RESPONSE_BYTES)
    return SqlResult(True, columns=columns, rows=tuple(tuple(r) for r in rows), truncated=truncated)
