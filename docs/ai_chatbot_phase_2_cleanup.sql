-- =============================================================================
-- FellOo AI chatbot - Phase 2 CLEANUP / ROLLBACK SQL (PART C, version 2)
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
-- Undoes docs/ai_chatbot_phase_2_provisioning.sql. Destructive, so:
--
--   1. BEGIN comes FIRST and the guard runs INSIDE the transaction. Once the guard raises,
--      PostgreSQL ignores every later statement until the transaction ends, and the final
--      COMMIT becomes a rollback. That holds even when psql is run WITHOUT ON_ERROR_STOP,
--      whose default is to keep executing after an error. (The guard used to sit before
--      BEGIN, where a missing ON_ERROR_STOP let the whole script run.)
--   2. After the guard is deliberately removed, an identity block refuses to continue unless
--      both roles and the schema carry the provisioning marker, the schema is owned by the
--      running role, and it holds exactly the ten expected views and nothing else. Only
--      then does anything get dropped.
--
-- To arm it, after review and only on the intended database, delete the FIRST DO block
-- (the one that raises "cleanup guard"). Keep BEGIN and everything else.
--
--     psql -X "$BRANCH_DIRECT_URL" -v ON_ERROR_STOP=1 -f docs/ai_chatbot_phase_2_cleanup.sql
--
-- Use -X: a personal psqlrc could set ON_ERROR_ROLLBACK, which makes psql ignore errors
-- inside a transaction and would defeat the guard.
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
-- Do not use psql -1/--single-transaction with this file (it already contains BEGIN/COMMIT).
-- Assumes provisioning COMMITTED. If provisioning rolled back, there is nothing to clean up
-- and this script will stop at the identity block. It only touches objects created by
-- provisioning (schema chatbot, the two chatbot roles, their column grants, one default-
-- privilege rule) and never Django's tables or roles. DROP ROLE fails while any privilege,
-- owned object or default rule still depends on a role, so a completed run proves nothing
-- was left behind.
--
-- Before running: disconnect chatbot_ro. If sessions are open, an admin with the
-- pg_signal_backend privilege can end them first:
--   SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE usename = 'chatbot_ro';
-- =============================================================================
BEGIN;

-- C0a. GUARD: delete this block to arm the script.
DO $$
BEGIN
    RAISE EXCEPTION 'cleanup guard: review the script, confirm the target database, then delete this DO block';
END
$$;

-- C0b. IDENTITY: only continue for objects that provisioning created, in the shape it left them.
DO $$
DECLARE
    bad bigint;
BEGIN
    IF (SELECT count(*) FROM pg_roles WHERE rolname IN ('chatbot_ro', 'chatbot_view_owner')) IS DISTINCT FROM 2 THEN
        RAISE EXCEPTION 'identity: both chatbot roles must exist; stop and investigate manually';
    END IF;
    SELECT count(*) INTO bad FROM pg_roles AS r
     WHERE r.rolname IN ('chatbot_ro', 'chatbot_view_owner')
       AND coalesce(shobj_description(r.oid, 'pg_authid'), '') NOT LIKE 'felloo-chatbot-v2:%';
    IF bad IS DISTINCT FROM 0 THEN
        RAISE EXCEPTION 'identity: a chatbot role lacks the provisioning marker, so it was not created by this tooling';
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_namespace WHERE nspname = 'chatbot') THEN
        RAISE EXCEPTION 'identity: schema chatbot does not exist; stop and investigate manually';
    END IF;
    IF coalesce(obj_description('chatbot'::regnamespace, 'pg_namespace'), '') NOT LIKE 'felloo-chatbot-v2:%' THEN
        RAISE EXCEPTION 'identity: schema chatbot lacks the provisioning marker, so it was not created by this tooling';
    END IF;
    IF (SELECT pg_get_userbyid(nspowner) FROM pg_namespace WHERE nspname = 'chatbot') IS DISTINCT FROM current_user THEN
        RAISE EXCEPTION 'identity: schema chatbot is not owned by the role running this script';
    END IF;

    SELECT count(*) INTO bad FROM pg_class
     WHERE relnamespace = 'chatbot'::regnamespace AND relkind NOT IN ('i', 'I', 't', 'c');
    IF bad IS DISTINCT FROM 10 THEN
        RAISE EXCEPTION 'identity: schema chatbot must hold exactly 10 relations, found %', bad;
    END IF;
    SELECT count(*) INTO bad FROM pg_class
     WHERE relnamespace = 'chatbot'::regnamespace AND relkind NOT IN ('i', 'I', 't', 'c')
       AND (relkind <> 'v'
            OR pg_get_userbyid(relowner) <> 'chatbot_view_owner'
            OR relname NOT IN ('v_market_listings', 'v_market_wanted', 'v_lost_found_open',
                               'v_library_projects', 'v_library_notes', 'v_tutors',
                               'v_courses', 'v_departments', 'v_skill_topics', 'v_announcements'));
    IF bad IS DISTINCT FROM 0 THEN
        RAISE EXCEPTION 'identity: schema chatbot holds something other than the expected ten views';
    END IF;
    SELECT count(*) INTO bad FROM pg_proc WHERE pronamespace = 'chatbot'::regnamespace;
    IF bad IS DISTINCT FROM 0 THEN
        RAISE EXCEPTION 'identity: schema chatbot contains functions that provisioning never creates';
    END IF;
END
$$;

-- C1. Dropping the schema removes the ten views and, with them, chatbot_ro's SELECT grants
--     and the view owner's USAGE on the schema (CREATE was already revoked in provisioning A9).
DROP SCHEMA IF EXISTS chatbot CASCADE;

-- C2. Remove the view owner's column-level grants (mirror of provisioning A5).
REVOKE SELECT (id, category, "condition", exchange_type, price, created_at, status)
    ON public.resource_sharing_resourcelisting FROM chatbot_view_owner;
REVOKE SELECT (id, category, desired_exchange_type, created_at, status)
    ON public.resource_sharing_publicresourcerequest FROM chatbot_view_owner;
REVOKE SELECT (id, post_type, category, date_lost_or_found, created_at, status)
    ON public.lost_and_found_lostandfounditem FROM chatbot_view_owner;
REVOKE SELECT (id, department_id, level, created_at, status)
    ON public.library_libraryproject FROM chatbot_view_owner;
REVOKE SELECT (libraryproject_id)
    ON public.library_libraryproject_upvoted_by FROM chatbot_view_owner;
REVOKE SELECT (id, course_id, created_at)
    ON public.library_note FROM chatbot_view_owner;
REVOKE SELECT (note_id)
    ON public.library_note_upvoted_by FROM chatbot_view_owner;
REVOKE SELECT (id, profile_type, is_free, hourly_fee, average_rating, total_reviews, is_active)
    ON public.peer_tutoring_tutorprofile FROM chatbot_view_owner;
REVOKE SELECT (id, code, title, department_id, is_active)
    ON public.peer_tutoring_academiccourse FROM chatbot_view_owner;
REVOKE SELECT (name, category, is_active)
    ON public.peer_tutoring_skilltopic FROM chatbot_view_owner;
REVOKE SELECT (id, name, short_name)
    ON public.common_department FROM chatbot_view_owner;
REVOKE SELECT (title, category, priority, created_at, target_user_id, is_active)
    ON public.notifications_campusnotification FROM chatbot_view_owner;

-- C3. Restore PostgreSQL's default for functions the view owner might create (undoes the
--     default-privilege rule from provisioning A6). Needs the same temporary membership.
GRANT chatbot_view_owner TO CURRENT_USER WITH INHERIT FALSE, SET TRUE;
SET LOCAL ROLE chatbot_view_owner;
ALTER DEFAULT PRIVILEGES GRANT EXECUTE ON FUNCTIONS TO PUBLIC;
RESET ROLE;
REVOKE chatbot_view_owner FROM CURRENT_USER;

-- C4. Remove chatbot_ro's own database privilege, then both roles (see the DROP ROLE note above).
--     Only if chatbot_ro has an explicit entry in the database ACL (provisioning writes one only
--     when PUBLIC lacks CONNECT). Otherwise nothing is touched, so a NULL ACL stays NULL and every
--     other entry (owner, PUBLIC, other roles) is left exactly as it was.
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_database AS d CROSS JOIN LATERAL aclexplode(d.datacl) AS a
               WHERE d.datname = current_database() AND a.grantee = 'chatbot_ro'::regrole) THEN
        EXECUTE format('REVOKE ALL ON DATABASE %I FROM chatbot_ro', current_database());
    END IF;
END
$$;
DROP ROLE IF EXISTS chatbot_ro;
DROP ROLE IF EXISTS chatbot_view_owner;

-- C5. Assertions: nothing of the feature remains.
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname IN ('chatbot_ro', 'chatbot_view_owner')) THEN
        RAISE EXCEPTION 'assert: a chatbot role still exists';
    END IF;
    IF EXISTS (SELECT 1 FROM pg_namespace WHERE nspname = 'chatbot') THEN
        RAISE EXCEPTION 'assert: schema chatbot still exists';
    END IF;
    -- Leftover column grants, memberships and default-privilege rules cannot be asserted by
    -- name once the roles are gone; DROP ROLE in C4 already refuses to proceed while any
    -- of them still depends on a role, so reaching this point proves they are gone.
END
$$;

COMMIT;
