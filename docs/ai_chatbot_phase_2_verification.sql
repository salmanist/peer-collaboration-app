-- =============================================================================
-- FellOo AI chatbot - Phase 2 VERIFICATION SQL (PART B, version 2)
--
--   *** VALIDATED ON DISPOSABLE LOCAL POSTGRESQL ONLY - NOT VALIDATED ON NEON ***
--   (read-only: SELECT statements only)
--
-- Run locally against provisioning v2 (report sections 14, 17, 19, 21; reported, not independently
-- reproduced here). Never run on Neon. A clean psql exit does not prove the checks passed: read the
-- results against the expectation stated above each query.
--
-- Run AFTER docs/ai_chatbot_phase_2_provisioning.sql, as the OWNER role, one statement
-- at a time or with:
--     psql -X "$BRANCH_DIRECT_URL" -v ON_ERROR_STOP=1 -f docs/ai_chatbot_phase_2_verification.sql
-- Nothing here writes, grants, sets or creates anything. Every check uses EFFECTIVE
-- privilege functions (direct grants + PUBLIC + inherited roles), not mere existence of a
-- role or grant. Expected result is stated above each query. Copy results back for review;
-- do not claim anything is verified on Neon until they exist.
-- =============================================================================


-- [V1] Role attributes. Expect 2 rows. Both: super=f createdb=f createrole=f repl=f
--      bypassrls=f. chatbot_ro login=t, chatbot_view_owner login=f. conn limit 5 / -1.
SELECT rolname, rolsuper, rolcreatedb, rolcreaterole, rolreplication, rolbypassrls,
       rolcanlogin, rolconnlimit
FROM pg_roles
WHERE rolname IN ('chatbot_ro', 'chatbot_view_owner')
ORDER BY rolname;


-- [V1b] Identity markers written by provisioning (the cleanup script refuses to drop anything
--       without them). Expect 3 rows, each marker starting 'felloo-chatbot-v2:'.
SELECT 'role' AS kind, r.rolname AS name, shobj_description(r.oid, 'pg_authid') AS marker
FROM pg_roles AS r
WHERE r.rolname IN ('chatbot_ro', 'chatbot_view_owner')
UNION ALL
SELECT 'schema', 'chatbot', obj_description('chatbot'::regnamespace, 'pg_namespace');


-- [V2] Roles the chatbot roles are DIRECT members of. Expect ZERO rows (zero direct
--      memberships also means zero indirect ones).
SELECT pg_get_userbyid(roleid) AS granted_role, pg_get_userbyid(member) AS member_role
FROM pg_auth_members
WHERE member IN (SELECT oid FROM pg_roles WHERE rolname IN ('chatbot_ro', 'chatbot_view_owner'));


-- [V2b] EFFECTIVE membership in the admin role or any powerful role. Catalog-driven, so a
--       role that exists only on Neon cannot raise an error elsewhere. Expect ZERO rows.
SELECT c.rolname AS chatbot_role, r.rolname AS powerful_role
FROM pg_roles AS r
CROSS JOIN (VALUES ('chatbot_ro'::name), ('chatbot_view_owner'::name)) AS c(rolname)
WHERE (r.rolname IN ('neon_superuser', 'pg_read_all_data', 'pg_write_all_data')
       OR r.rolname = current_user)
  AND pg_has_role(c.rolname, r.oid, 'MEMBER');


-- [V2c] Informational: who administers the chatbot roles. PostgreSQL 16+ gives the role
--       that ran CREATE ROLE an ADMIN OPTION membership. Expect only your admin role, with
--       admin_option=t, inherit_option=f, set_option=f (the temporary SET grant is revoked).
SELECT pg_get_userbyid(roleid) AS role_administered, pg_get_userbyid(member) AS admin_role,
       admin_option, inherit_option, set_option
FROM pg_auth_members
WHERE roleid IN (SELECT oid FROM pg_roles WHERE rolname IN ('chatbot_ro', 'chatbot_view_owner'));


-- [V2d] Any membership in a chatbot role that still carries SET or INHERIT (the temporary
--       grant from provisioning A6 must be gone). Expect ZERO rows. If a server setting such as
--       createrole_self_grant gives role creators SET/INHERIT automatically, rows from the
--       creator would appear here; they are harmless to chatbot_ro but must then be reviewed.
SELECT pg_get_userbyid(roleid) AS role_administered, pg_get_userbyid(member) AS member_role,
       pg_get_userbyid(grantor) AS grantor, set_option, inherit_option, admin_option
FROM pg_auth_members
WHERE roleid IN (SELECT oid FROM pg_roles WHERE rolname IN ('chatbot_ro', 'chatbot_view_owner'))
  AND (set_option OR inherit_option);


-- [V3] EFFECTIVE access of chatbot_ro to any relation outside schema chatbot (system schemas
--      excluded: catalogs are readable by every role in PostgreSQL). Expect ZERO rows.
SELECT n.nspname, c.relname, c.relkind
FROM pg_class AS c JOIN pg_namespace AS n ON n.oid = c.relnamespace
WHERE n.nspname NOT LIKE 'pg\_%' AND n.nspname <> 'information_schema' AND n.nspname <> 'chatbot'
  AND ( (c.relkind IN ('r', 'p', 'v', 'm', 'f') AND (
            has_table_privilege('chatbot_ro', c.oid, 'SELECT,INSERT,UPDATE,DELETE,TRUNCATE,REFERENCES,TRIGGER')
         OR has_any_column_privilege('chatbot_ro', c.oid, 'SELECT,INSERT,UPDATE,REFERENCES')))
     OR (c.relkind = 'S' AND has_sequence_privilege('chatbot_ro', c.oid, 'USAGE,SELECT,UPDATE')) );


-- [V4] Contents of schema chatbot. Expect exactly 10 rows: relkind v, owner chatbot_view_owner,
--      ro_can_select=t, ro_can_write=f, reloptions {security_barrier=true}.
SELECT c.relname, c.relkind, pg_get_userbyid(c.relowner) AS owner,
       has_table_privilege('chatbot_ro', c.oid, 'SELECT') AS ro_can_select,
       has_table_privilege('chatbot_ro', c.oid, 'INSERT,UPDATE,DELETE,TRUNCATE,REFERENCES,TRIGGER') AS ro_can_write,
       c.reloptions
FROM pg_class AS c
WHERE c.relnamespace = 'chatbot'::regnamespace AND c.relkind NOT IN ('i', 'I', 't', 'c')
ORDER BY c.relname;


-- [V4b] Exact column list per view, to compare with backend/apps/chatbot/catalog.py.
--       Expect no "message" anywhere and no id/email/phone/description/location columns.
SELECT c.relname AS view_name,
       string_agg(a.attname, ', ' ORDER BY a.attnum) AS columns
FROM pg_class AS c
JOIN pg_attribute AS a ON a.attrelid = c.oid AND a.attnum > 0 AND NOT a.attisdropped
WHERE c.relnamespace = 'chatbot'::regnamespace AND c.relkind = 'v'
GROUP BY c.relname
ORDER BY c.relname;


-- [V4c] Functions or types created in schema chatbot. Expect ZERO rows.
SELECT 'function' AS kind, p.proname AS name
FROM pg_proc AS p WHERE p.pronamespace = 'chatbot'::regnamespace
UNION ALL
SELECT 'type', t.typname
FROM pg_type AS t
WHERE t.typnamespace = 'chatbot'::regnamespace AND t.typrelid = 0 AND t.typelem = 0;


-- [V5] Where chatbot_ro or chatbot_view_owner can CREATE. Expect ZERO rows.
SELECT r.rolname, n.nspname AS schema_with_create
FROM pg_roles AS r CROSS JOIN pg_namespace AS n
WHERE r.rolname IN ('chatbot_ro', 'chatbot_view_owner')
  AND n.nspname NOT LIKE 'pg\_%' AND n.nspname <> 'information_schema'
  AND has_schema_privilege(r.rolname, n.oid, 'CREATE');


-- [V5b] Database-level view. Expect create_in_db = f for both roles. can_connect/can_temp
--       are informational: PUBLIC normally holds CONNECT and TEMPORARY, which cannot be
--       revoked from one role (see the report, residual risks).
SELECT r.rolname,
       has_database_privilege(r.rolname, current_database(), 'CREATE')  AS create_in_db,
       has_database_privilege(r.rolname, current_database(), 'CONNECT') AS can_connect,
       has_database_privilege(r.rolname, current_database(), 'TEMPORARY') AS can_temp
FROM pg_roles AS r
WHERE r.rolname IN ('chatbot_ro', 'chatbot_view_owner')
ORDER BY r.rolname;


-- [V5c] The database ACL itself. The Neon metadata audit never collected this, so it is an
--       OPEN GAP until this result exists. NULL = PostgreSQL's built-in default.
SELECT datname, pg_get_userbyid(datdba) AS owner, datacl::text AS database_acl
FROM pg_database
WHERE datname = current_database();


-- [V6] Table-level grants held by the chatbot roles (explicit ACL entries). Expect: only
--      SELECT by chatbot_ro on the ten chatbot views; NO row for chatbot_view_owner.
SELECT n.nspname, c.relname,
       pg_get_userbyid(acl.grantee) AS grantee, acl.privilege_type, acl.is_grantable
FROM pg_class AS c
JOIN pg_namespace AS n ON n.oid = c.relnamespace
CROSS JOIN LATERAL aclexplode(c.relacl) AS acl
WHERE acl.grantee IN ('chatbot_ro'::regrole, 'chatbot_view_owner'::regrole)
ORDER BY n.nspname, c.relname, grantee;


-- [V6b] COLUMN-level grants held by the chatbot roles. Expect only chatbot_view_owner, only
--       SELECT, exactly the columns granted in provisioning A5 (the files must agree), and
--       NO "message" column on notifications_campusnotification. chatbot_ro: zero rows.
SELECT n.nspname, c.relname, pg_get_userbyid(acl.grantee) AS grantee,
       string_agg(a.attname, ', ' ORDER BY a.attnum) AS columns, acl.privilege_type
FROM pg_attribute AS a
JOIN pg_class AS c ON c.oid = a.attrelid
JOIN pg_namespace AS n ON n.oid = c.relnamespace
CROSS JOIN LATERAL aclexplode(a.attacl) AS acl
WHERE a.attacl IS NOT NULL AND NOT a.attisdropped
  AND acl.grantee IN ('chatbot_ro'::regrole, 'chatbot_view_owner'::regrole)
GROUP BY n.nspname, c.relname, acl.grantee, acl.privilege_type
ORDER BY n.nspname, c.relname, grantee;


-- [V7] Role-level settings stored for chatbot_ro. Expect default_transaction_read_only=on,
--      statement_timeout=3s, lock_timeout=1s, idle_in_transaction_session_timeout=5s,
--      search_path=chatbot. Stored defaults are defence in depth, not the boundary.
SELECT setconfig
FROM pg_db_role_setting
WHERE setrole = 'chatbot_ro'::regrole AND setdatabase = 0;


-- [V8] Default-privilege rules naming the chatbot roles. Expect exactly one row: view owner,
--      object type f (functions), ACL without PUBLIC (rule from provisioning A6).
SELECT pg_get_userbyid(d.defaclrole) AS for_objects_created_by,
       d.defaclnamespace::regnamespace::text AS in_schema,
       d.defaclobjtype AS object_type, d.defaclacl::text AS default_acl
FROM pg_default_acl AS d
WHERE d.defaclrole IN ('chatbot_ro'::regrole, 'chatbot_view_owner'::regrole);


-- [V9] Open sessions of chatbot_ro (informational; none expected before the password is set).
SELECT count(*) AS sessions FROM pg_stat_activity WHERE usename = 'chatbot_ro';


-- -----------------------------------------------------------------------------
-- MANUAL CHECK AS chatbot_ro (after the password is set; not part of this file):
--   expected: SELECT count(*) FROM chatbot.v_departments            -> works
--             SELECT * FROM public.accounts_user                    -> permission denied
--             INSERT INTO chatbot.v_departments VALUES ('x','y')    -> permission denied
--             CREATE TABLE chatbot.t (a int)                        -> permission denied
--   The backend repeats the privilege checks automatically:
--   apps.chatbot.executor.verify_isolation() must return an empty list.
-- -----------------------------------------------------------------------------
