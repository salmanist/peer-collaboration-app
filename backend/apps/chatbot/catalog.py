"""Single source of truth for what the generated-SQL path may read.

Must match docs/ai_chatbot_phase_2_provisioning.sql (an integration test compares the
two against a real provisioned database). Columns were checked against a read-only capture
of the live Neon metadata; that full capture is intentionally NOT in this repository (it is
kept outside version control), and the findings drawn from it are summarised in
docs/ai_chatbot_phase_2_report.md. The columns exclude identity, contact, location, file and
user-authored free-text columns. Nothing here has been validated on Neon itself.
"""

from typing import NamedTuple

SCHEMA = "chatbot"

# Aggregate answers must cover at least this many rows (enforced structurally via HAVING).
MIN_GROUP_SIZE = 3

# Resource limits.
MAX_SQL_CHARS = 2000
MAX_AST_NODES = 300
MAX_ROWS = 50
MAX_RESPONSE_BYTES = 16 * 1024
MAX_OFFSET = 1000
STATEMENT_TIMEOUT_MS = 3000
CONNECT_TIMEOUT_S = 5
AGGREGATE_QUERIES_PER_HOUR = 30


class View(NamedTuple):
    columns: frozenset
    # Columns that single out one row (or nearly). Never allowed in the WHERE / GROUP BY /
    # ORDER BY of an aggregate query: filtering on them would let a "group of 3" be
    # narrowed down to individual records by differencing.
    quasi_identifiers: frozenset


def _view(columns, quasi=()):
    return View(frozenset(columns), frozenset(quasi))


VIEWS = {
    "v_market_listings": _view(
        ["id", "category", "condition", "exchange_type", "price", "created_at"],
        ["id", "price", "created_at"],
    ),
    "v_market_wanted": _view(
        ["id", "category", "desired_exchange_type", "created_at"], ["id", "created_at"]
    ),
    "v_lost_found_open": _view(
        ["id", "post_type", "category", "date_lost_or_found", "created_at"],
        ["id", "date_lost_or_found", "created_at"],
    ),
    "v_library_projects": _view(
        ["id", "department_short_name", "level", "created_at", "upvote_count"],
        ["id", "created_at", "upvote_count"],
    ),
    "v_library_notes": _view(
        ["id", "course_code", "department_short_name", "created_at", "upvote_count"],
        ["id", "created_at", "upvote_count"],
    ),
    "v_tutors": _view(
        ["id", "profile_type", "is_free", "hourly_fee", "average_rating", "total_reviews"],
        ["id", "hourly_fee", "average_rating", "total_reviews"],
    ),
    "v_courses": _view(["code", "title", "department_short_name"]),
    "v_departments": _view(["name", "short_name"]),
    "v_skill_topics": _view(["name", "category"]),
    # No "message": personal notifications share that column and can name students; the live
    # rows are unreviewed. Titles of broadcast announcements only.
    "v_announcements": _view(["title", "category", "priority", "created_at"], ["created_at"]),
}

AGGREGATE_FUNCTIONS = frozenset({"count", "sum", "avg", "min", "max"})
SCALAR_FUNCTIONS = frozenset({"lower", "upper", "round", "abs", "date_trunc", "now"})
ALLOWED_FUNCTIONS = AGGREGATE_FUNCTIONS | SCALAR_FUNCTIONS

# date_trunc units: coarse only, so a timestamp cannot be used to isolate one record.
DATE_TRUNC_UNITS = frozenset({"week", "month", "year"})

COMPARISON_OPERATORS = frozenset({"=", "<>", "!=", "<", ">", "<=", ">="})
ARITHMETIC_OPERATORS = frozenset({"+", "-", "*", "/", "%"})
LIKE_OPERATORS = frozenset({"~~", "~~*", "!~~", "!~~*"})  # LIKE / ILIKE / NOT LIKE / NOT ILIKE

# pg_catalog type names allowed in explicit casts.
ALLOWED_CAST_TYPES = frozenset(
    {"int2", "int4", "int8", "numeric", "float8", "text", "varchar", "bool", "date", "timestamptz"}
)
