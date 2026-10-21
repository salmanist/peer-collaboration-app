-- =============================================================================
-- FellOo AI chatbot - Neon READ-ONLY METADATA AUDIT
-- =============================================================================
-- Purpose : Give the Phase 2 reviewers the live-schema facts that
--           docs/ai_chatbot_phase_1_audit.md (sections 3.1 and 4) could not verify.
--
-- Safety  : * Every statement below is a single SELECT. Nothing here writes,
--             grants, creates, alters, sets, or installs anything.
--           * Only system-catalog / metadata is read. NO application rows are
--             read (no accounts_*, rides_*, resource_*, etc. data).
--           * Passwords/hashes are never selected: pg_authid and
--             pg_roles.rolpassword are deliberately NOT used.
--           * No credentials, connection strings or environment variables appear.
--           * Written to be run manually by a human in the Neon SQL Editor.
--
-- HOW TO RUN (Neon console -> your project -> SQL Editor)
--   1. Pick the database that the Django app uses (normally "neondb").
--   2. Run ONE section at a time: select just that statement's text (from its
--      "-- [Sx.y]" comment down to the closing semicolon) and press Run
--      ("Run selected"). Running the whole file at once may show only the
--      last result.
--   3. Copy each result grid (use the editor's Copy / Export as CSV or JSON)
--      into your reply, labelled with the section id, e.g. "S2.1".
--   4. If a statement errors with "permission denied", copy the error text
--      and the section id, and continue with the next section. Every section
--      is independent.
--
-- WHAT TO COPY BACK (priority order)
--   MUST : S0.1, S0.2, S1.1, S2.1, S2.2, S3.1, S4.1, S5.1, S5.2, S6.1, S6.2,
--          S6.3, S6.4, S7.1, S7.2, S8.1, S9.1, S9.2
--   NICE : S0.3, S1.2, S3.2, S4.2, S5.3, S6.5, S6.6, S10.1
--   Large outputs (S2.1, S5.2): export to CSV/JSON and paste, or paste the
--   first and last 20 rows if truncated.
--
-- PERMISSIONS NOTES
--   * pg_catalog tables used here (pg_class, pg_attribute, pg_constraint,
--     pg_index, pg_namespace, pg_roles, pg_auth_members, pg_policy, pg_views,
--     pg_extension, ...) are readable by any role. They list objects even if
--     the current role cannot read the objects' data.
--   * information_schema is NOT used for tables/columns because it only shows
--     objects the current role has privileges on, which could hide tables.
--   * S5.x reads public.django_migrations (migration names + timestamps only).
--     If the current role lacks SELECT on it, S5.2 fails with "permission
--     denied" - report that and move on (S5.1 tells you whether it exists).
--   * S6.x/S7.x roles/privileges are visible to all roles, but Neon may hide
--     some internal roles. The result shows what the current role can see.
--   * Row counts in S1.1 are planner ESTIMATES from pg_class.reltuples (-1 =
--     never analyzed). They are not queries against the tables.
-- =============================================================================


-- #############################################################################
-- SECTION 0 - DATABASE CONTEXT
-- #############################################################################

-- [S0.1] Who am I, which database, which Postgres version.
SELECT
    current_database()              AS database_name,
    current_user                    AS current_role_name,
    session_user                    AS session_role_name,
    version()                       AS postgres_version,
    current_setting('server_version_num') AS server_version_num,
    current_setting('search_path')  AS search_path;


-- [S0.2] Non-system schemas, their owners and ACLs, and what the CURRENT role
--        can do in them. (System schemas pg_* and information_schema omitted.)
SELECT
    n.nspname                                    AS schema_name,
    pg_get_userbyid(n.nspowner)                  AS owner,
    n.nspacl::text                               AS schema_acl,
    has_schema_privilege(current_user, n.oid, 'USAGE')  AS current_can_use,
    has_schema_privilege(current_user, n.oid, 'CREATE') AS current_can_create
FROM pg_namespace AS n
WHERE n.nspname NOT LIKE 'pg\_%' ESCAPE '\'
  AND n.nspname <> 'information_schema'
ORDER BY n.nspname;


-- [S0.3] Capabilities of the CURRENT role that matter for provisioning
--        chatbot_ro later (can it create roles / databases / schemas?).
SELECT
    r.rolname,
    r.rolsuper,
    r.rolcreaterole,
    r.rolcreatedb,
    r.rolcanlogin,
    r.rolbypassrls,
    has_database_privilege(current_user, current_database(), 'CREATE')  AS can_create_schema_in_db,
    has_database_privilege(current_user, current_database(), 'CONNECT') AS can_connect
FROM pg_roles AS r
WHERE r.rolname = current_user;


-- #############################################################################
-- SECTION 1 - TABLES AND VIEWS (inventory)
-- #############################################################################

-- [S1.1] Every table / view / materialized view / partitioned table / foreign
--        table in non-system schemas, with owner, kind, estimated rows and
--        row-level-security flags.
--        relkind: r=table, p=partitioned table, v=view, m=materialized view,
--        f=foreign table.
SELECT
    n.nspname                      AS schema_name,
    c.relname                      AS object_name,
    c.relkind                      AS kind,
    pg_get_userbyid(c.relowner)    AS owner,
    c.reltuples::bigint            AS est_rows_planner_estimate,
    c.relrowsecurity               AS rls_enabled,
    c.relforcerowsecurity          AS rls_forced
FROM pg_class AS c
JOIN pg_namespace AS n ON n.oid = c.relnamespace
WHERE c.relkind IN ('r', 'p', 'v', 'm', 'f')
  AND n.nspname NOT LIKE 'pg\_%' ESCAPE '\'
  AND n.nspname <> 'information_schema'
ORDER BY n.nspname, c.relname;


-- [S1.2] Quick yes/no for tables Phase 1 flagged as uncertain. "exists = false"
--        means the table is NOT in the live database.
SELECT
    t.expected_table,
    to_regclass(t.expected_table) IS NOT NULL AS exists_in_db
FROM (VALUES
    ('public.accounts_user'),
    ('public.accounts_studentroster'),
    ('public.accounts_emailverification'),
    ('public.common_department'),
    ('public.common_notification'),            -- legacy table, should be gone or unused
    ('public.common_academiccourse'),           -- legacy name
    ('public.peer_tutoring_academiccourse'),    -- current name per migrations
    ('public.peer_tutoring_skilltopic'),
    ('public.notifications_campusnotification'),
    ('public.notifications_usernotificationstate'),
    ('public.library_libraryproject'),
    ('public.library_note'),
    ('public.resource_sharing_resourcelisting'),
    ('public.lost_and_found_lostandfounditem'),
    ('public.peer_tutoring_tutorprofile'),
    ('public.peer_tutoring_collaborationrequest')
) AS t(expected_table)
ORDER BY t.expected_table;


-- #############################################################################
-- SECTION 2 - COLUMNS
-- #############################################################################

-- [S2.1] One row per table/view with all its columns on a single line
--        ("name type [NOT NULL] [DEFAULT ...] [IDENTITY] [GENERATED]").
--        Uses pg_attribute so every column is listed regardless of grants.
SELECT
    n.nspname AS schema_name,
    c.relname AS object_name,
    string_agg(
        a.attname || ' ' || format_type(a.atttypid, a.atttypmod)
        || CASE WHEN a.attnotnull THEN ' NOT NULL' ELSE '' END
        || CASE WHEN d.adbin IS NOT NULL THEN ' DEFAULT ' || pg_get_expr(d.adbin, d.adrelid) ELSE '' END
        || CASE a.attidentity WHEN 'a' THEN ' IDENTITY(ALWAYS)' WHEN 'd' THEN ' IDENTITY(BY DEFAULT)' ELSE '' END
        || CASE a.attgenerated WHEN 's' THEN ' GENERATED(STORED)' ELSE '' END,
        E'\n' ORDER BY a.attnum
    ) AS columns
FROM pg_class AS c
JOIN pg_namespace AS n ON n.oid = c.relnamespace
JOIN pg_attribute AS a ON a.attrelid = c.oid AND a.attnum > 0 AND NOT a.attisdropped
LEFT JOIN pg_attrdef AS d ON d.adrelid = a.attrelid AND d.adnum = a.attnum
WHERE c.relkind IN ('r', 'p', 'v', 'm', 'f')
  AND n.nspname NOT LIKE 'pg\_%' ESCAPE '\'
  AND n.nspname <> 'information_schema'
GROUP BY n.nspname, c.relname
ORDER BY n.nspname, c.relname;


-- [S2.2] Targeted check of the columns the Phase 1 audit is unsure about
--        (accounts_user may or may not still hold name/department columns;
--        studentroster should hold dept_id). Returns only matching columns.
SELECT
    c.relname                              AS table_name,
    a.attname                              AS column_name,
    format_type(a.atttypid, a.atttypmod)   AS data_type,
    NOT a.attnotnull                       AS nullable
FROM pg_class AS c
JOIN pg_namespace AS n ON n.oid = c.relnamespace AND n.nspname = 'public'
JOIN pg_attribute AS a ON a.attrelid = c.oid AND a.attnum > 0 AND NOT a.attisdropped
WHERE (c.relname = 'accounts_user'
       AND a.attname IN ('full_name', 'department', 'department_id', 'enrollment_year',
                         'phone_number', 'gender', 'roll_no', 'roll_number'))
   OR (c.relname = 'accounts_studentroster'
       AND a.attname IN ('dept_id', 'department', 'full_name', 'enrollment_year',
                         'phone_number', 'gender', 'roll_no'))
ORDER BY c.relname, a.attname;


-- #############################################################################
-- SECTION 3 - CONSTRAINTS AND RELATIONSHIPS
-- #############################################################################

-- [S3.1] Primary keys, unique, foreign keys and check constraints with their
--        full definitions (FKs show the referenced table/columns and ON
--        DELETE/UPDATE actions). contype: p=primary, u=unique, f=foreign,
--        c=check.
SELECT
    n.nspname                       AS schema_name,
    c.relname                       AS table_name,
    con.conname                     AS constraint_name,
    con.contype                     AS type,
    pg_get_constraintdef(con.oid)   AS definition
FROM pg_constraint AS con
JOIN pg_class AS c ON c.oid = con.conrelid
JOIN pg_namespace AS n ON n.oid = c.relnamespace
WHERE con.contype IN ('p', 'u', 'f', 'c')
  AND n.nspname NOT LIKE 'pg\_%' ESCAPE '\'
  AND n.nspname <> 'information_schema'
ORDER BY n.nspname, c.relname, con.contype, con.conname;


-- [S3.2] Compact foreign-key map: child.column -> parent.column. Easier to
--        read than S3.1 when drawing relationships.
SELECT
    child_ns.nspname  || '.' || child.relname  AS child_table,
    (SELECT string_agg(att.attname, ', ' ORDER BY k.ord)
       FROM unnest(con.conkey) WITH ORDINALITY AS k(attnum, ord)
       JOIN pg_attribute AS att ON att.attrelid = con.conrelid AND att.attnum = k.attnum) AS child_columns,
    parent_ns.nspname || '.' || parent.relname AS parent_table,
    (SELECT string_agg(att.attname, ', ' ORDER BY k.ord)
       FROM unnest(con.confkey) WITH ORDINALITY AS k(attnum, ord)
       JOIN pg_attribute AS att ON att.attrelid = con.confrelid AND att.attnum = k.attnum) AS parent_columns,
    con.confdeltype   AS on_delete,   -- a=no action, r=restrict, c=cascade, n=set null, d=set default
    con.confupdtype   AS on_update
FROM pg_constraint AS con
JOIN pg_class AS child        ON child.oid  = con.conrelid
JOIN pg_namespace AS child_ns ON child_ns.oid = child.relnamespace
JOIN pg_class AS parent       ON parent.oid = con.confrelid
JOIN pg_namespace AS parent_ns ON parent_ns.oid = parent.relnamespace
WHERE con.contype = 'f'
  AND child_ns.nspname NOT LIKE 'pg\_%' ESCAPE '\'
  AND child_ns.nspname <> 'information_schema'
ORDER BY child_table, child_columns;


-- #############################################################################
-- SECTION 4 - INDEXES
-- #############################################################################

-- [S4.1] Index definitions (full CREATE INDEX text), uniqueness and primary
--        flag, for non-system schemas.
SELECT
    n.nspname       AS schema_name,
    t.relname       AS table_name,
    i.relname       AS index_name,
    ix.indisunique  AS is_unique,
    ix.indisprimary AS is_primary,
    pg_get_indexdef(ix.indexrelid) AS definition
FROM pg_index AS ix
JOIN pg_class AS i ON i.oid = ix.indexrelid
JOIN pg_class AS t ON t.oid = ix.indrelid
JOIN pg_namespace AS n ON n.oid = t.relnamespace
WHERE n.nspname NOT LIKE 'pg\_%' ESCAPE '\'
  AND n.nspname <> 'information_schema'
ORDER BY n.nspname, t.relname, i.relname;


-- [S4.2] Invalid / not-ready indexes (should return zero rows).
SELECT
    n.nspname AS schema_name,
    i.relname AS index_name,
    ix.indisvalid,
    ix.indisready
FROM pg_index AS ix
JOIN pg_class AS i ON i.oid = ix.indexrelid
JOIN pg_namespace AS n ON n.oid = i.relnamespace
WHERE (NOT ix.indisvalid OR NOT ix.indisready)
  AND n.nspname NOT LIKE 'pg\_%' ESCAPE '\'
  AND n.nspname <> 'information_schema';


-- #############################################################################
-- SECTION 5 - DJANGO MIGRATION HISTORY
-- #############################################################################

-- [S5.1] Does django_migrations exist, and can the current role read it?
--        (Reads no table data; only checks existence and privilege.)
SELECT
    to_regclass('public.django_migrations') IS NOT NULL AS table_exists,
    CASE WHEN to_regclass('public.django_migrations') IS NULL THEN NULL
         ELSE has_table_privilege(current_user, 'public.django_migrations', 'SELECT')
    END AS current_role_can_select;


-- [S5.2] Applied migrations: app label, migration name, applied timestamp.
--        This is Django bookkeeping metadata, not application records.
--        Needs SELECT on public.django_migrations (see S5.1).
--        Look for the OLD divergent migration names that accounts/0003's
--        docstring mentions (names that do NOT exist in the repo).
SELECT
    id,
    app,
    name,
    applied
FROM public.django_migrations
ORDER BY id;


-- [S5.3] Compact per-app summary (count and latest migration) - use if S5.2 is
--        too long to paste.
SELECT
    app,
    count(*)     AS applied_count,
    max(applied) AS last_applied
FROM public.django_migrations
GROUP BY app
ORDER BY app;


-- #############################################################################
-- SECTION 6 - ROLES AND PRIVILEGES
-- #############################################################################
-- NOTE: only pg_roles (which masks passwords) is used. pg_authid is NOT
-- queried and rolpassword is NOT selected.

-- [S6.1] Roles (excluding built-in pg_* roles): safe attributes only.
SELECT
    r.rolname,
    r.rolsuper,
    r.rolinherit,
    r.rolcreaterole,
    r.rolcreatedb,
    r.rolcanlogin,
    r.rolreplication,
    r.rolbypassrls,
    r.rolconnlimit,
    r.rolvaliduntil
FROM pg_roles AS r
WHERE r.rolname NOT LIKE 'pg\_%' ESCAPE '\'
ORDER BY r.rolname;


-- [S6.2] Role memberships (who inherits from whom), including built-in
--        pg_* roles such as pg_read_all_data when granted.
SELECT
    pg_get_userbyid(m.roleid)  AS granted_role,
    pg_get_userbyid(m.member)  AS member_role,
    pg_get_userbyid(m.grantor) AS grantor,
    m.admin_option
FROM pg_auth_members AS m
ORDER BY granted_role, member_role;


-- [S6.3] Schema-level privileges (USAGE / CREATE) per grantee for non-system
--        schemas. An empty grantee means PUBLIC (= everyone).
SELECT
    n.nspname                                         AS schema_name,
    CASE WHEN a.grantee = 0 THEN 'PUBLIC' ELSE pg_get_userbyid(a.grantee) END AS grantee,
    a.privilege_type,
    a.is_grantable
FROM pg_namespace AS n
CROSS JOIN LATERAL aclexplode(coalesce(n.nspacl, acldefault('n', n.nspowner))) AS a
WHERE n.nspname NOT LIKE 'pg\_%' ESCAPE '\'
  AND n.nspname <> 'information_schema'
ORDER BY n.nspname, grantee, a.privilege_type;


-- [S6.4] Table / view / sequence privileges per grantee. Shows whether PUBLIC
--        or any app role has direct grants. NULL ACL = default (owner only).
--        Limited to relations that have an explicit ACL, so the output stays
--        small. Empty result = only owners have access.
SELECT
    n.nspname                                         AS schema_name,
    c.relname                                         AS object_name,
    c.relkind                                         AS kind,
    CASE WHEN a.grantee = 0 THEN 'PUBLIC' ELSE pg_get_userbyid(a.grantee) END AS grantee,
    string_agg(a.privilege_type, ', ' ORDER BY a.privilege_type) AS privileges
FROM pg_class AS c
JOIN pg_namespace AS n ON n.oid = c.relnamespace
CROSS JOIN LATERAL aclexplode(c.relacl) AS a
WHERE c.relkind IN ('r', 'p', 'v', 'm', 'f', 'S')
  AND c.relacl IS NOT NULL
  AND n.nspname NOT LIKE 'pg\_%' ESCAPE '\'
  AND n.nspname <> 'information_schema'
  AND a.grantee <> c.relowner
GROUP BY n.nspname, c.relname, c.relkind, a.grantee
ORDER BY n.nspname, c.relname, grantee;


-- [S6.5] Default privileges (ALTER DEFAULT PRIVILEGES settings) that would
--        auto-grant on future objects. Empty = none configured.
SELECT
    pg_get_userbyid(d.defaclrole)                    AS for_objects_created_by,
    n.nspname                                        AS in_schema,
    d.defaclobjtype                                  AS object_type, -- r=tables, S=sequences, f=functions, T=types, n=schemas
    d.defaclacl::text                                AS default_acl
FROM pg_default_acl AS d
LEFT JOIN pg_namespace AS n ON n.oid = d.defaclnamespace
ORDER BY for_objects_created_by, in_schema, object_type;


-- [S6.6] Role-level and database-level settings (e.g. statement_timeout,
--        default_transaction_read_only) that already apply. Values are
--        configuration parameters, not credentials.
SELECT
    CASE WHEN s.setrole = 0 THEN '(all roles)' ELSE pg_get_userbyid(s.setrole) END AS role_name,
    CASE WHEN s.setdatabase = 0 THEN '(all databases)' ELSE (SELECT datname FROM pg_database WHERE oid = s.setdatabase) END AS database_name,
    s.setconfig
FROM pg_db_role_setting AS s
ORDER BY role_name, database_name;


-- #############################################################################
-- SECTION 7 - ROW-LEVEL SECURITY
-- #############################################################################

-- [S7.1] Tables with RLS enabled or forced (empty result = no RLS anywhere).
SELECT
    n.nspname             AS schema_name,
    c.relname             AS table_name,
    c.relrowsecurity      AS rls_enabled,
    c.relforcerowsecurity AS rls_forced
FROM pg_class AS c
JOIN pg_namespace AS n ON n.oid = c.relnamespace
WHERE c.relkind IN ('r', 'p')
  AND (c.relrowsecurity OR c.relforcerowsecurity)
  AND n.nspname NOT LIKE 'pg\_%' ESCAPE '\'
  AND n.nspname <> 'information_schema'
ORDER BY n.nspname, c.relname;


-- [S7.2] RLS policies (empty result = no policies defined).
SELECT
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual        AS using_expression,
    with_check  AS with_check_expression
FROM pg_policies
ORDER BY schemaname, tablename, policyname;


-- #############################################################################
-- SECTION 8 - EXISTING VIEWS
-- #############################################################################

-- [S8.1] Existing views and materialized views, owner and defining query text.
--        (Definition text is SQL source, not data. Expect none in public, or
--        only extension-provided views.)
SELECT
    v.schemaname,
    v.viewname,
    v.viewowner,
    'view'                AS kind,
    v.definition
FROM pg_views AS v
WHERE v.schemaname NOT LIKE 'pg\_%' ESCAPE '\'
  AND v.schemaname <> 'information_schema'
UNION ALL
SELECT
    m.schemaname,
    m.matviewname,
    m.matviewowner,
    'materialized view',
    m.definition
FROM pg_matviews AS m
WHERE m.schemaname NOT LIKE 'pg\_%' ESCAPE '\'
  AND m.schemaname <> 'information_schema'
ORDER BY 1, 2;


-- #############################################################################
-- SECTION 9 - EXTENSIONS
-- #############################################################################

-- [S9.1] Installed extensions and versions.
SELECT
    e.extname      AS extension_name,
    e.extversion   AS installed_version,
    n.nspname      AS installed_in_schema,
    pg_get_userbyid(e.extowner) AS owner
FROM pg_extension AS e
JOIN pg_namespace AS n ON n.oid = e.extnamespace
ORDER BY e.extname;


-- [S9.2] Is pgvector available on this Neon project (needed for later RAG, not
--        for SQL views)? installed_version NULL = available but not installed.
SELECT
    name,
    default_version,
    installed_version
FROM pg_available_extensions
WHERE name IN ('vector', 'pg_trgm', 'unaccent')
ORDER BY name;


-- #############################################################################
-- SECTION 10 - OPTIONAL
-- #############################################################################

-- [S10.1] User-defined functions/procedures in non-system schemas: names,
--         owners and SECURITY DEFINER flag only (function bodies are NOT
--         returned). SECURITY DEFINER objects can bypass the privilege model.
SELECT
    n.nspname                        AS schema_name,
    p.proname                        AS function_name,
    pg_get_userbyid(p.proowner)      AS owner,
    p.prosecdef                      AS security_definer,
    p.prokind                        AS kind          -- f=function, p=procedure, a=aggregate, w=window
FROM pg_proc AS p
JOIN pg_namespace AS n ON n.oid = p.pronamespace
WHERE n.nspname NOT LIKE 'pg\_%' ESCAPE '\'
  AND n.nspname <> 'information_schema'
  AND NOT EXISTS (                       -- skip functions owned by extensions
        SELECT 1 FROM pg_depend AS d
        WHERE d.objid = p.oid AND d.deptype = 'e')
ORDER BY n.nspname, p.proname;

-- =============================================================================
-- END OF SCRIPT
-- =============================================================================
