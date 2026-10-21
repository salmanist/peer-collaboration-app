-- =============================================================================
-- FellOo AI chatbot - Phase 2 PROVISIONING SQL (PART A, version 2)
--
--   *** VALIDATED ON DISPOSABLE LOCAL POSTGRESQL ONLY - NOT VALIDATED ON NEON ***
--
-- Version 2 (with the later fixes recorded in report sections 15 and 18) was parsed offline and then
-- run end to end (provision, verify, guarded cleanup, re-provision) on DISPOSABLE LOCAL PostgreSQL 18
-- clusters only. Those runs are recorded in docs/ai_chatbot_phase_2_report.md (sections 14, 17, 19, 21);
-- they are reported results and were not independently reproduced when this header was written.
-- It has NEVER been run on Neon or any other remote database. Review it, and run it first on a
-- Neon BRANCH COPY, before any remote use. See the report for exactly what is and is not verified.
--
-- Companion files (kept separate on purpose, so one command cannot run all of them):
--   docs/ai_chatbot_phase_2_verification.sql   read-only checks, run AFTER this file
--   docs/ai_chatbot_phase_2_cleanup.sql        guarded rollback of this file
--
-- HOW TO RUN (later, after approval) - local scratch first, then a Neon BRANCH COPY:
--   1. Create a Neon branch copy of the project (console -> Branches). Never start on the
--      main branch.
--   2. Use the DIRECT (unpooled) connection string of that branch for the project owner
--      role. Neon recommends direct connections for DDL; the pooler runs PgBouncer in
--      transaction mode, which this script does not need or want.
--   3. Keep the connection string in an environment variable, never in a file:
--        psql -X "$BRANCH_DIRECT_URL" -v ON_ERROR_STOP=1 -f docs/ai_chatbot_phase_2_provisioning.sql
--      ON_ERROR_STOP=1 is required: the first error ends the session, and the still-open
--      transaction rolls back, so nothing is left half-provisioned. -X skips any personal
--      psqlrc, which could otherwise set ON_ERROR_ROLLBACK and make psql ignore errors
--      inside a transaction.
--
-- EXIT STATUS IS NOT A SUCCESS SIGNAL unless ON_ERROR_STOP=1 is set. Without it psql keeps going after
-- an error (its default); the open transaction is aborted, COMMIT then acts as ROLLBACK, nothing is
-- changed, and psql can still exit 0 (observed on local PostgreSQL). So: always use -X -v ON_ERROR_STOP=1,
-- check the exit status ($? must be 0; psql returned 3 on a script error), never append '|| true', and
-- confirm the outcome with docs/ai_chatbot_phase_2_verification.sql. Do not use psql -1 or
-- --single-transaction (this file manages its own transaction). This file is written for psql only;
-- nothing here claims it works in the Neon SQL Editor or through the pooler. A '\set ON_ERROR_STOP on'
-- first line was considered and not added: it is psql-only, it cannot be parsed as SQL by the offline
-- tests, and the transaction already fails closed.
--   4. Create the roles with SQL only (this file). Roles created through the Neon console,
--      CLI or API are automatically added to neon_superuser, which would defeat the design.
--   5. Set the password in a SEPARATE psql session (see the last lines of this file). Never
--      paste a password into this file, an editor history, a ticket or a chat.
--
-- DESIGN (three roles, least privilege):
--   owner role         owns the application tables. NEVER used by the chatbot.
--   chatbot_view_owner NOLOGIN. Owns the views. Column-level SELECT on exactly the base
--                      columns the views read, no table-level privilege anywhere.
--   chatbot_ro         LOGIN. The only identity the generated-SQL executor connects as.
--                      SELECT on the ten views in schema "chatbot", nothing else.
--
-- WHAT THIS FILE DOES NOT CHANGE: it never revokes anything from PUBLIC and never touches
-- the owner role or any existing table, so existing Django access is unchanged. The only
-- PUBLIC mention is a default-privilege rule for functions the view owner might create later.
--
-- The role-level settings in A2 are convenience and defence in depth only (a session can
-- override them). The privilege grants and the assertions in A10 are the boundary.
-- =============================================================================
BEGIN;

-- A1. Roles. No elevated attributes, no memberships, no password (cannot log in yet).
CREATE ROLE chatbot_view_owner NOLOGIN
    NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION NOBYPASSRLS NOINHERIT;
CREATE ROLE chatbot_ro LOGIN
    NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION NOBYPASSRLS NOINHERIT
    CONNECTION LIMIT 5;

-- Identity markers. The cleanup script refuses to drop any role or schema that does not carry
-- the prefix 'felloo-chatbot-v2:', so it can never remove same-named objects it did not create.
COMMENT ON ROLE chatbot_view_owner IS 'felloo-chatbot-v2: view owner created by docs/ai_chatbot_phase_2_provisioning.sql';
COMMENT ON ROLE chatbot_ro IS 'felloo-chatbot-v2: read-only executor role created by docs/ai_chatbot_phase_2_provisioning.sql';

-- A2. Role-level defaults (stored server-side, so they persist across transactions and
--     therefore also behind the pooler; session-level SET does not survive pooling).
ALTER ROLE chatbot_ro SET search_path = chatbot;
ALTER ROLE chatbot_ro SET default_transaction_read_only = on;
ALTER ROLE chatbot_ro SET statement_timeout = '3s';
ALTER ROLE chatbot_ro SET lock_timeout = '1s';
ALTER ROLE chatbot_ro SET idle_in_transaction_session_timeout = '5s';

-- A3. Schema, owned by the admin role. The view owner may create views in it only while
--     this script runs (CREATE is revoked again in A9).
CREATE SCHEMA chatbot;
COMMENT ON SCHEMA chatbot IS 'felloo-chatbot-v2: restricted views for the chatbot, created by docs/ai_chatbot_phase_2_provisioning.sql';
GRANT USAGE, CREATE ON SCHEMA chatbot TO chatbot_view_owner;
GRANT USAGE ON SCHEMA chatbot TO chatbot_ro;

-- A4. chatbot_ro is brand new, so it holds nothing in public. No REVOKE ... ON ALL TABLES /
--     ALL SEQUENCES IN SCHEMA public here: local validation showed they are NOT no-ops. They turn
--     every default (NULL) ACL into an explicit owner-only ACL on all 50 tables and 47 sequences,
--     and cleanup cannot undo that. The verification file proves chatbot_ro has no access instead.
--     No REVOKE on schema public either: the role has no entry there, and on a schema whose ACL is NULL
--     a REVOKE would write an explicit one that cleanup cannot undo.
--     Database ACL: the brand-new chatbot_ro has no entry, so no REVOKE is needed, and CONNECT is
--     granted ONLY when the role cannot connect already (PUBLIC holds CONNECT by default, so on a
--     default/NULL ACL nothing is written and the ACL stays NULL). Cleanup removes chatbot_ro's
--     own entry if one exists, which restores either baseline exactly.
DO $$
BEGIN
    IF NOT has_database_privilege('chatbot_ro', current_database(), 'CONNECT') THEN
        EXECUTE format('GRANT CONNECT ON DATABASE %I TO chatbot_ro', current_database());
    END IF;
END
$$;

-- A5. Column-level SELECT for the view owner: exactly the columns the views read, including
--     columns used only in WHERE / JOIN. Verified against the live Neon column list.
--     "message" on notifications is deliberately NOT granted.
GRANT SELECT (id, category, "condition", exchange_type, price, created_at, status)
    ON public.resource_sharing_resourcelisting TO chatbot_view_owner;
GRANT SELECT (id, category, desired_exchange_type, created_at, status)
    ON public.resource_sharing_publicresourcerequest TO chatbot_view_owner;
GRANT SELECT (id, post_type, category, date_lost_or_found, created_at, status)
    ON public.lost_and_found_lostandfounditem TO chatbot_view_owner;
GRANT SELECT (id, department_id, level, created_at, status)
    ON public.library_libraryproject TO chatbot_view_owner;
GRANT SELECT (libraryproject_id)
    ON public.library_libraryproject_upvoted_by TO chatbot_view_owner;
GRANT SELECT (id, course_id, created_at)
    ON public.library_note TO chatbot_view_owner;
GRANT SELECT (note_id)
    ON public.library_note_upvoted_by TO chatbot_view_owner;
GRANT SELECT (id, profile_type, is_free, hourly_fee, average_rating, total_reviews, is_active)
    ON public.peer_tutoring_tutorprofile TO chatbot_view_owner;
GRANT SELECT (id, code, title, department_id, is_active)
    ON public.peer_tutoring_academiccourse TO chatbot_view_owner;
GRANT SELECT (name, category, is_active)
    ON public.peer_tutoring_skilltopic TO chatbot_view_owner;
GRANT SELECT (id, name, short_name)
    ON public.common_department TO chatbot_view_owner;
GRANT SELECT (title, category, priority, created_at, target_user_id, is_active)
    ON public.notifications_campusnotification TO chatbot_view_owner;

-- A6. Temporarily let the running admin role switch to the view owner (revoked in A8).
GRANT chatbot_view_owner TO CURRENT_USER WITH INHERIT FALSE, SET TRUE;
SET LOCAL ROLE chatbot_view_owner;

-- Abort unless the role switch is really in effect. If a client ran each statement in its
-- own transaction, SET LOCAL would already have expired and the views below would be created
-- with the WRONG owner; this turns that into a loud failure instead of a silent one.
DO $$
BEGIN
    IF current_user <> 'chatbot_view_owner' THEN
        RAISE EXCEPTION 'abort: SET LOCAL ROLE is not in effect; run this file as ONE transaction (psql -f)';
    END IF;
END
$$;

-- Safe default for FUTURE objects created by the view owner: no function it creates would be
-- executable by PUBLIC (PostgreSQL's default would allow it).
ALTER DEFAULT PRIVILEGES REVOKE EXECUTE ON FUNCTIONS FROM PUBLIC;

-- A7. Views (all security_barrier, so an outer predicate cannot be pushed below the view's
--     own WHERE and leak hidden rows through error behaviour). Free text typed by students
--     (titles, descriptions, locations, subjects, ...) is deliberately not exposed.
CREATE VIEW chatbot.v_market_listings WITH (security_barrier = true) AS
SELECT l.id, l.category, l."condition", l.exchange_type, l.price, l.created_at
FROM public.resource_sharing_resourcelisting AS l
WHERE l.status = 'active';

CREATE VIEW chatbot.v_market_wanted WITH (security_barrier = true) AS
SELECT r.id, r.category, r.desired_exchange_type, r.created_at
FROM public.resource_sharing_publicresourcerequest AS r
WHERE r.status = 'open';

CREATE VIEW chatbot.v_lost_found_open WITH (security_barrier = true) AS
SELECT i.id, i.post_type, i.category, i.date_lost_or_found, i.created_at
FROM public.lost_and_found_lostandfounditem AS i
WHERE i.status = 'open';

CREATE VIEW chatbot.v_library_projects WITH (security_barrier = true) AS
SELECT p.id,
       d.short_name AS department_short_name,
       p.level,
       p.created_at,
       (SELECT count(*) FROM public.library_libraryproject_upvoted_by AS u
         WHERE u.libraryproject_id = p.id)::integer AS upvote_count
FROM public.library_libraryproject AS p
LEFT JOIN public.common_department AS d ON d.id = p.department_id
WHERE p.status = 'approved';

-- Notes have no moderation status in the app: every note is visible when uploaded.
CREATE VIEW chatbot.v_library_notes WITH (security_barrier = true) AS
SELECT n.id,
       c.code AS course_code,
       d.short_name AS department_short_name,
       n.created_at,
       (SELECT count(*) FROM public.library_note_upvoted_by AS u
         WHERE u.note_id = n.id)::integer AS upvote_count
FROM public.library_note AS n
LEFT JOIN public.peer_tutoring_academiccourse AS c ON c.id = n.course_id
LEFT JOIN public.common_department AS d ON d.id = c.department_id;

-- "id" is the tutor PROFILE id (for deep links), not a user id.
CREATE VIEW chatbot.v_tutors WITH (security_barrier = true) AS
SELECT t.id, t.profile_type, t.is_free, t.hourly_fee, t.average_rating, t.total_reviews
FROM public.peer_tutoring_tutorprofile AS t
WHERE t.is_active;

-- Admin-managed catalogues (only admins can write courses and skill topics).
CREATE VIEW chatbot.v_courses WITH (security_barrier = true) AS
SELECT c.code, c.title, d.short_name AS department_short_name
FROM public.peer_tutoring_academiccourse AS c
JOIN public.common_department AS d ON d.id = c.department_id
WHERE c.is_active;

CREATE VIEW chatbot.v_departments WITH (security_barrier = true) AS
SELECT d.name, d.short_name
FROM public.common_department AS d;

CREATE VIEW chatbot.v_skill_topics WITH (security_barrier = true) AS
SELECT s.name, s.category
FROM public.peer_tutoring_skilltopic AS s
WHERE s.is_active;

-- Broadcast announcements only (target_user_id IS NULL). No "message": that column also
-- holds personal notifications that can contain student names, separated from broadcasts
-- only by this one predicate, and the live rows have not been reviewed.
CREATE VIEW chatbot.v_announcements WITH (security_barrier = true) AS
SELECT a.title, a.category, a.priority, a.created_at
FROM public.notifications_campusnotification AS a
WHERE a.target_user_id IS NULL AND a.is_active;

-- A8. Let chatbot_ro read exactly these views (only the view owner can grant on them),
--     then drop the temporary membership.
GRANT SELECT ON
    chatbot.v_market_listings, chatbot.v_market_wanted, chatbot.v_lost_found_open,
    chatbot.v_library_projects, chatbot.v_library_notes, chatbot.v_tutors,
    chatbot.v_courses, chatbot.v_departments, chatbot.v_skill_topics, chatbot.v_announcements
TO chatbot_ro;

RESET ROLE;

-- Before dropping the temporary membership, prove it is exactly what A6 granted: one row from
-- the admin role to itself, granted by the admin role, SET = true, INHERIT = false, ADMIN =
-- false. (The automatic PostgreSQL 16+ ADMIN-only row for the role creator is a different row,
-- normally granted by the bootstrap superuser, and is deliberately not matched here.) Any
-- surprise aborts the transaction instead of silently revoking the wrong thing.
DO $$
DECLARE
    mine  bigint;
    exact bigint;
BEGIN
    SELECT count(*) INTO mine FROM pg_auth_members
     WHERE roleid  = 'chatbot_view_owner'::regrole
       AND member  = (SELECT oid FROM pg_roles WHERE rolname = current_user)
       AND grantor = (SELECT oid FROM pg_roles WHERE rolname = current_user);
    SELECT count(*) INTO exact FROM pg_auth_members
     WHERE roleid  = 'chatbot_view_owner'::regrole
       AND member  = (SELECT oid FROM pg_roles WHERE rolname = current_user)
       AND grantor = (SELECT oid FROM pg_roles WHERE rolname = current_user)
       AND set_option AND NOT inherit_option AND NOT admin_option;
    IF mine IS DISTINCT FROM 1 OR exact IS DISTINCT FROM 1 THEN
        RAISE EXCEPTION 'assert: temporary membership in chatbot_view_owner is not exactly one grant with SET=true, INHERIT=false, ADMIN=false (rows granted by this role: %, exact matches: %)', mine, exact;
    END IF;
END
$$;

REVOKE chatbot_view_owner FROM CURRENT_USER;

-- A9. The view owner can no longer create anything in the schema.
REVOKE CREATE ON SCHEMA chatbot FROM chatbot_view_owner;

-- A10. In-transaction assertions on EFFECTIVE privileges (direct + PUBLIC + inherited). Any
--      failure raises and the whole transaction rolls back. Each check is written so that it
--      cannot pass on "no rows" (every count is an aggregate or tested with IS DISTINCT FROM)
--      and cannot error on a role that exists only on Neon (catalog-driven, never by name).
--      These checks cover tables, views, sequences, schemas, ownership, membership and role
--      settings. They do NOT cover privileges PostgreSQL grants to PUBLIC on functions,
--      languages, types, large objects or temporary objects; the verification file reports
--      those separately and they are listed as residual risks in the report.
DO $$
DECLARE
    bad      bigint;
    settings text[];
BEGIN
    -- 1. attributes
    SELECT count(*) INTO bad FROM pg_roles
     WHERE rolname IN ('chatbot_ro', 'chatbot_view_owner')
       AND (rolsuper OR rolcreatedb OR rolcreaterole OR rolreplication OR rolbypassrls
            OR (rolname = 'chatbot_view_owner' AND rolcanlogin)
            OR (rolname = 'chatbot_ro' AND NOT rolcanlogin));
    IF bad IS DISTINCT FROM 0 THEN RAISE EXCEPTION 'assert: wrong role attributes'; END IF;

    -- 2. neither chatbot role is a (direct) member of any role; zero direct memberships
    --    also means zero indirect ones
    SELECT count(*) INTO bad FROM pg_auth_members
     WHERE member IN (SELECT oid FROM pg_roles WHERE rolname IN ('chatbot_ro', 'chatbot_view_owner'));
    IF bad IS DISTINCT FROM 0 THEN RAISE EXCEPTION 'assert: a chatbot role is a member of another role'; END IF;

    -- 3. effective membership in the admin role or any powerful role (only roles that exist)
    SELECT count(*) INTO bad
      FROM pg_roles AS r
     CROSS JOIN (VALUES ('chatbot_ro'::name), ('chatbot_view_owner'::name)) AS c(rolname)
     WHERE (r.rolname IN ('neon_superuser', 'pg_read_all_data', 'pg_write_all_data')
            OR r.rolname = current_user)
       AND pg_has_role(c.rolname, r.oid, 'MEMBER');
    IF bad IS DISTINCT FROM 0 THEN RAISE EXCEPTION 'assert: effective membership in a powerful role'; END IF;

    -- 4. chatbot_ro owns nothing ('x'::regrole raises if the role is missing: no silent pass)
    bad := (SELECT count(*) FROM pg_class     WHERE relowner  = 'chatbot_ro'::regrole)
         + (SELECT count(*) FROM pg_namespace WHERE nspowner  = 'chatbot_ro'::regrole)
         + (SELECT count(*) FROM pg_proc      WHERE proowner  = 'chatbot_ro'::regrole);
    IF bad IS DISTINCT FROM 0 THEN RAISE EXCEPTION 'assert: chatbot_ro owns objects'; END IF;

    -- 5. EFFECTIVE access of chatbot_ro to any relation outside schema chatbot
    --    (system schemas excluded: pg_catalog is readable by every role by design)
    SELECT count(*) INTO bad
      FROM pg_class AS c JOIN pg_namespace AS n ON n.oid = c.relnamespace
     WHERE n.nspname NOT LIKE 'pg\_%' AND n.nspname <> 'information_schema' AND n.nspname <> 'chatbot'
       AND ( (c.relkind IN ('r', 'p', 'v', 'm', 'f') AND (
                 has_table_privilege('chatbot_ro', c.oid, 'SELECT,INSERT,UPDATE,DELETE,TRUNCATE,REFERENCES,TRIGGER')
              OR has_any_column_privilege('chatbot_ro', c.oid, 'SELECT,INSERT,UPDATE,REFERENCES')))
          OR (c.relkind = 'S' AND has_sequence_privilege('chatbot_ro', c.oid, 'USAGE,SELECT,UPDATE')) );
    IF bad IS DISTINCT FROM 0 THEN RAISE EXCEPTION 'assert: chatbot_ro can reach objects outside schema chatbot'; END IF;

    -- 6. schema chatbot holds exactly the ten views and no functions
    SELECT count(*) INTO bad FROM pg_class
     WHERE relnamespace = 'chatbot'::regnamespace AND relkind NOT IN ('i', 'I', 't', 'c');
    IF bad IS DISTINCT FROM 10 THEN RAISE EXCEPTION 'assert: expected 10 relations in chatbot, found %', bad; END IF;
    SELECT count(*) INTO bad FROM pg_class
     WHERE relnamespace = 'chatbot'::regnamespace AND relkind NOT IN ('i', 'I', 't', 'c')
       AND relname NOT IN ('v_market_listings', 'v_market_wanted', 'v_lost_found_open',
                           'v_library_projects', 'v_library_notes', 'v_tutors',
                           'v_courses', 'v_departments', 'v_skill_topics', 'v_announcements');
    IF bad IS DISTINCT FROM 0 THEN RAISE EXCEPTION 'assert: chatbot schema holds an unexpected relation'; END IF;
    SELECT count(*) INTO bad FROM pg_proc WHERE pronamespace = 'chatbot'::regnamespace;
    IF bad IS DISTINCT FROM 0 THEN RAISE EXCEPTION 'assert: functions exist in schema chatbot'; END IF;

    -- 7. every view: owned by the view owner, security_barrier, readable but not writable
    SELECT count(*) INTO bad FROM pg_class AS c
     WHERE c.relnamespace = 'chatbot'::regnamespace AND c.relkind = 'v'
       AND ( pg_get_userbyid(c.relowner) <> 'chatbot_view_owner'
          OR NOT has_table_privilege('chatbot_ro', c.oid, 'SELECT')
          OR has_table_privilege('chatbot_ro', c.oid, 'INSERT,UPDATE,DELETE,TRUNCATE,REFERENCES,TRIGGER')
          OR NOT coalesce(c.reloptions @> ARRAY['security_barrier=true'], false) );
    IF bad IS DISTINCT FROM 0 THEN RAISE EXCEPTION 'assert: a view has the wrong owner, options or privileges'; END IF;

    -- 8. the view owner: owns only those views, holds no table-level or write privilege on
    --    any public table (column-level SELECT only), and can no longer create in the schema
    bad := (SELECT count(*) FROM pg_class     WHERE relowner = 'chatbot_view_owner'::regrole
                                                  AND relnamespace <> 'chatbot'::regnamespace)
         + (SELECT count(*) FROM pg_namespace WHERE nspowner = 'chatbot_view_owner'::regrole)
         + (SELECT count(*) FROM pg_proc      WHERE proowner = 'chatbot_view_owner'::regrole);
    IF bad IS DISTINCT FROM 0 THEN RAISE EXCEPTION 'assert: view owner owns objects it should not'; END IF;
    SELECT count(*) INTO bad
      FROM pg_class AS c JOIN pg_namespace AS n ON n.oid = c.relnamespace
     WHERE n.nspname = 'public' AND c.relkind IN ('r', 'p', 'v', 'm', 'f')
       AND ( has_table_privilege('chatbot_view_owner', c.oid, 'SELECT,INSERT,UPDATE,DELETE,TRUNCATE,REFERENCES,TRIGGER')
          OR has_any_column_privilege('chatbot_view_owner', c.oid, 'INSERT,UPDATE,REFERENCES') );
    IF bad IS DISTINCT FROM 0 THEN RAISE EXCEPTION 'assert: view owner has table-level or write privileges'; END IF;
    IF has_schema_privilege('chatbot_view_owner', 'chatbot', 'CREATE') THEN
        RAISE EXCEPTION 'assert: view owner can still create objects in schema chatbot';
    END IF;

    -- 9. chatbot_ro cannot create objects in any schema or in the database
    IF EXISTS (SELECT 1 FROM pg_namespace AS n
                WHERE n.nspname NOT LIKE 'pg\_%' AND n.nspname <> 'information_schema'
                  AND has_schema_privilege('chatbot_ro', n.oid, 'CREATE'))
       OR has_database_privilege('chatbot_ro', current_database(), 'CREATE') THEN
        RAISE EXCEPTION 'assert: chatbot_ro can create objects';
    END IF;

    -- 10. the role-level defaults from A2 were stored (tolerant of quoting; a failure here
    --     is safe: it only aborts, and the pattern can then be corrected)
    SELECT setconfig INTO settings FROM pg_db_role_setting
     WHERE setrole = 'chatbot_ro'::regrole AND setdatabase = 0;
    IF settings IS NULL
       OR NOT EXISTS (SELECT 1 FROM unnest(settings) AS s WHERE s LIKE 'default_transaction_read_only=on%')
       OR NOT EXISTS (SELECT 1 FROM unnest(settings) AS s WHERE s LIKE 'statement_timeout=3%')
       OR NOT EXISTS (SELECT 1 FROM unnest(settings) AS s WHERE s ~ '^search_path="?chatbot"?$') THEN
        RAISE EXCEPTION 'assert: role-level settings for chatbot_ro were not stored as expected';
    END IF;

    -- 11. identity markers are present (the cleanup script depends on them)
    SELECT count(*) INTO bad FROM pg_roles AS r
     WHERE r.rolname IN ('chatbot_ro', 'chatbot_view_owner')
       AND coalesce(shobj_description(r.oid, 'pg_authid'), '') LIKE 'felloo-chatbot-v2:%';
    IF bad IS DISTINCT FROM 2 THEN RAISE EXCEPTION 'assert: a chatbot role lacks its identity marker'; END IF;
    IF coalesce(obj_description('chatbot'::regnamespace, 'pg_namespace'), '') NOT LIKE 'felloo-chatbot-v2:%' THEN
        RAISE EXCEPTION 'assert: schema chatbot lacks its identity marker';
    END IF;

    -- 12. the temporary membership from A6 is really gone: no grant made by this role keeps
    --     SET or INHERIT on either chatbot role (the automatic ADMIN-only row is not matched)
    SELECT count(*) INTO bad FROM pg_auth_members
     WHERE roleid IN ('chatbot_ro'::regrole, 'chatbot_view_owner'::regrole)
       AND grantor = (SELECT oid FROM pg_roles WHERE rolname = current_user)
       AND (set_option OR inherit_option);
    IF bad IS DISTINCT FROM 0 THEN RAISE EXCEPTION 'assert: a SET/INHERIT membership granted by this role survived the revoke'; END IF;
END
$$;

COMMIT;

-- A11. HUMAN STEP, separate psql session, after COMMIT (never in a file, ticket, chat or
--      editor history):
--        psql -X "$BRANCH_DIRECT_URL"
--        \password chatbot_ro
--      Then store the chatbot connection string ONLY in the backend environment as
--      CHATBOT_DB_URL (sslmode=require). Do not set CHATBOT_SQL_ENABLED until the
--      verification file has been reviewed and the application-side isolation check passes.
