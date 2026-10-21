# FellOo AI Chatbot - Phase 1: Schema, Data-Access and Security Specification

Status: **Phase 1 (audit and specification only). No chatbot code, views, roles, migrations, endpoints or dependencies exist or were added.**
Branch: `ai-chatbot-integration` (from `merged`). Related earlier report: `AI_CHATBOT_PROJECT_AUDIT.md` (repo root, broader but shallower).

Evidence labels used throughout:

| Tag | Meaning |
|---|---|
| **[SRC]** | Verified from Django model/view/serializer source |
| **[MIG]** | Verified from migration files |
| **[LIVE]** | Verified against the live Neon schema. **Nothing in this document carries this tag.** |
| **[ASSUME]** | Assumption or unresolved question |

---

## 1. Executive Summary

- The backend is a Django 5.2 / DRF monolith. **Every record a student can see is already gated in Django view code**, not in the database. No row-level security (RLS), no Postgres views, no custom roles or grants appear anywhere in source or migrations. [SRC][MIG]
- Consequence: a database role that is merely "read-only" would still be able to read every student's private rows (print documents, ride requests, chat messages, claims). **A read-only role alone is not a privacy boundary.** The only safe SQL design is: a dedicated role granted `SELECT` on a small set of purpose-built views and nothing else.
- Recommended split for the pilot:
  - **Campus-wide discovery** (marketplace, lost and found, library, notes, tutors, courses, announcements) via Gemini-proposed SQL against ~9 restricted views.
  - **Anything personal** (my rides, my prints, my sessions, my notifications) via fixed, user-scoped Django ORM handlers. Never SQL.
  - **Refuse** contact details, other students' identities, locations, files and chat content.
- Biggest findings that shape the design:
  1. Existing APIs already return other students' **emails** (`owner_email`, `poster_email`, `tutor_email`, `claimant_email`, ...). That is current product behaviour, but the chatbot must not widen or amplify it. Treat email as prohibited in LLM context.
  2. Several list endpoints apply **no status filter** (marketplace listings, lost-and-found items, notes, collaboration requests), so "visible to students" is looser than "sensible to show a chatbot". The proposed views are deliberately stricter than the API.
  3. The live Neon schema was built from **two diverging migration chains** that were later reconciled with a state-only migration (`accounts/migrations/0003_merge_salman_zahra_state.py`). Model and migration files may not equal the live schema. **Live verification is mandatory before any view is created.**
  4. `User` has no name/department/phone columns; they live in `StudentRoster` and are resolved by email in Python. SQL views over users need a join on `lower(email)` and are best avoided in v1.
- **Live Neon verification: pending.** See section 4.

---

## 2. Verified Architecture and Code Locations

| Concern | Location | Notes |
|---|---|---|
| Settings | `backend/config/settings/base.py` | DB from env (L78-97), JWT (L137-141), `CORS_ALLOW_ALL_ORIGINS=True` (L151), `ADMIN_EMAILS` (L157) [SRC] |
| Settings overrides | `backend/config/settings/dev.py`, `prod.py` | dev: `DEBUG=True`, `ALLOWED_HOSTS=["*"]`; default module in `manage.py` L9 and `config/asgi.py` L5 is **dev** [SRC] |
| URL tree | `backend/config/urls.py` | `/api/{auth,admin,rides,library,printing,ondemand,resources,lost-and-found,tutoring,notifications}/`, `/api/schema/`, `/api/docs/` [SRC] |
| Auth | `backend/accounts/` | `User` (`models.py` L30), `EmailVerification`, `StudentRoster`; JWT via SimpleJWT; `DEFAULT_AUTHENTICATION_CLASSES` = JWT only [SRC] |
| Admin gate | `backend/accounts/admin_views.py` L19 `IsPlatformAdmin` | role admin or `is_staff` [SRC] |
| Module apps | `backend/apps/{rides,ondemand,library,printing,resource_sharing,lost_and_found,peer_tutoring,notifications}/` | one Django app each; app labels frozen to match Neon [SRC, the root rules file] |
| Shared | `backend/common/` | `Department` (`models.py`), `notify()` helper, geo, storage |
| WebSockets | `backend/config/routing.py`, `apps/*/consumers.py`, `apps/resource_sharing/websocket_auth.py` | JWT in query string; four peer-chat consumers [SRC] |
| Mobile HTTP | `mobile/src/core/network/apiClient.ts` | axios, Bearer interceptor, single-flight 401 refresh (L22-60) [SRC] |
| Mobile session | `mobile/src/core/auth/session.ts` | Zustand; SecureStore (native) / localStorage (web) [SRC] |
| Mobile chat UI patterns | `mobile/app/(app)/tutoring/chat/[sessionId].tsx`, `.../resources/chat/[requestId].tsx`, `.../lost-and-found/chat/[claimId].tsx` | peer-to-peer chat screens to reuse for layout conventions [SRC] |
| Mobile feature layout | `mobile/src/features/<feature>/{data,presentation}` + thin routes in `mobile/app/(app)/` | per the root rules file [SRC] |
| Docs conventions | `docs/documentation.txt`, `docs/history.txt`, `docs/system_design.md`, `docs/SRS.md`, `docs/api-contracts/*.md` | API contract first, then Swagger [SRC] |
| Existing AI code | none | no LLM SDK, no pgvector in `backend/requirements.txt`; pgvector only *planned* in `docs/system_design.md` L13, L82-85 [SRC] |
| Tests | `backend/common/tests.py` (2 tests); `accounts/tests.py`, `apps/resource_sharing/tests.py` have none | [SRC] |
| Raw SQL | none outside migrations | `grep` for `.raw(`, `cursor()`, `.extra(` found nothing in app code [SRC] |

---

## 3. Schema Catalog and Relationships

Table names follow Django's default `<app_label>_<model_lowercase>` (frozen labels, the root rules file) except where noted. **All names below are inferred from source and are unverified against Neon [ASSUME].** One `db_table` override exists: `AcademicCourse` was created with `db_table="peer_tutoring_academiccourse"` in `common/migrations/0003_academiccourse.py` L46 and then removed from `common`'s state in `0005_drop_academiccourse_pointer.py`; the model now lives in `peer_tutoring` [MIG].

### 3.1 Migration vs live-schema mismatch risks [MIG]

| Risk | Evidence |
|---|---|
| `accounts` 0003 is **state-only** (`SeparateDatabaseAndState`, no SQL). Its docstring states Neon already had the columns because both developers applied diverging 0003-0008 chains, recorded in `django_migrations` under old names. | `accounts/migrations/0003_merge_salman_zahra_state.py` L1-20 |
| That migration removes `User.department`, `enrollment_year`, `full_name` from model state. If the live `accounts_user` still has those columns (the docstring implies the live schema may differ), **names and departments could also exist as columns on `accounts_user`**. | same file, `RemoveField` ops |
| `StudentRoster.dept` uses `db_column="dept_id"` (same file). | same file |
| `common` migration 0004 copies rows from `common.Notification` to `notifications.CampusNotification` with `RunPython`, then deletes the old model **in state only**. The old table may still exist in Neon. | `common/migrations/0004_notifications_to_campus.py` L26-30 |
| `AcademicCourse` moved between apps with a `db_table` override; `library.Note.course` points at it via `0007_note_course_peer_tutoring` (state ops). | `library/migrations/0007_note_course_peer_tutoring.py` L16 |
| `docs/history.txt` records that test data was wiped from Neon on 2026-08-17 and that the shared DB is the single source of truth. | `docs/history.txt` |

`makemigrations --check` / `showmigrations` were **not run** in this phase because they open a database connection (see section 4).

### 3.2 Models, columns and constraints [SRC]

Common conventions: BigAutoField PKs (`DEFAULT_AUTO_FIELD`), except `notifications` (UUID PKs). `created_at` is `auto_now_add`. Default ordering `-created_at` unless stated.

**accounts**

| Model | Columns | Notes |
|---|---|---|
| `User` (`accounts_user`) | `id`, `password`, `last_login`, `is_superuser`, `email` (unique), `role` (`student`,`admin`; default `student`), `is_email_verified`, `is_active` (default False), `is_staff`, `created_at`, `updated_at` | name/department/phone are **properties** resolved from `StudentRoster` by case-insensitive email (`models.py` L51-101). Promotion to admin happens in `save()` via `ADMIN_EMAILS` (L46-49). |
| `EmailVerification` | `user` FK CASCADE, `code` (6 digits), `expires_at`, `created_at` | OTP: **prohibited** |
| `StudentRoster` | `email` (unique), `roll_no`, `full_name`, `dept` FK→Department SET_NULL (`dept_id`), `enrollment_year`, `gender` (default `other`), `phone_number`, `imported_at` | identity and contact: **prohibited** |

**common**: `Department` (`name` unique, `short_name` unique).

**library**

| Model | Columns |
|---|---|
| `LibraryProject` | `author` FK User CASCADE, `title`, `department` FK Department SET_NULL (null), `abstract`, `github_link`, `level` (`simple`,`semester`,`fyp`), `status` (`pending`,`approved`,`rejected`; default pending), `created_at`, `upvoted_by` M2M User, `bookmarked_by` M2M User |
| `LibraryProjectFile` | `project` FK, `file`, `uploaded_at` |
| `Note` | `author` FK User, `title`, `course` FK AcademicCourse SET_NULL (null), `semester`, `description`, `created_at`, `upvoted_by` M2M, `bookmarked_by` M2M; **no status/moderation field by design** (`library/models.py` L50-51 comment), notes are public on upload |
| `NoteFile` | `note` FK, `file`, `uploaded_at` |

**rides**

| Model | Columns |
|---|---|
| `Location` | `name` (unique), `lat`, `lng` |
| `Ride` | `offerer` FK User, `departure`, `destination`, `departure_lat/lng`, `destination_lat/lng` (null), `departure_date`, `departure_time`, `seats_total` (1-8), `seats_available`, `same_gender_only`, `status` (`open`,`in_progress`,`completed`,`cancelled`,`expired`), `started_at`, `completed_at`, `created_at` |
| `RideJoinRequest` | `ride` FK, `requester` FK User, `status` (`pending`,`accepted`,`declined`), `created_at`; **unique (ride, requester)** |

**ondemand**

| Model | Columns |
|---|---|
| `RideProfile` | `user` 1:1, `role` (`driver`,`rider`), `vehicle_make/model/colour`, `plate_number`, `vehicle_seats`, `is_approved`, `is_online`, `last_lat/lng`, `last_seen`, `created_at` |
| `FareSetting` | `rate_per_km` (decimal) |
| `Place` | `name` (unique), `lat`, `lng` |
| `OnDemandRide` | `rider` FK User, `driver` FK User SET_NULL, `pickup_label/lat/lng`, `drop_label/lat/lng`, `distance_km`, `fare`, `route` JSON, `status` (`requested`,`accepted`,`arrived`,`in_progress`,`completed`,`cancelled`,`no_driver`), `cancelled_by`, `created_at`, `accepted_at` |

**printing**

| Model | Columns |
|---|---|
| `PrinterProfile` | `user` 1:1, `location_note`, `supports_color`, `supports_double_sided`, `created_at` |
| `PrintRequest` | `requester` FK User, `printer` FK User SET_NULL, `target_printer` FK User SET_NULL, `document` file, `page_range`, `copies` (1-100), `is_color`, `is_double_sided`, `status` (`open`,`accepted`,`done`,`cancelled`), `collection_note`, `created_at`, `accepted_at`, `completed_at` |
| `PrintRating` | `request` 1:1, `printer` FK User, `rater` FK User, `score` (1-5), `comment`, `created_at` |

**resource_sharing**

| Model | Columns / constraints |
|---|---|
| `ResourceListing` | `owner` FK User, `title`, `category` (`notes`,`books`,`stationery`,`lab_equipment`,`other`), `course` (free text), `condition` (`new`,`used`,`digital`), `exchange_type` (`free`,`lend`,`exchange`,`sell`,`rent`), `price`, `image`, `description` (max 1500), `status` (`active`,`reserved`,`unavailable`), `created_at`, `updated_at`. Indexes: (`status`,`-created_at`), (`category`,`status`), (`exchange_type`,`status`). `clean()` enforces price only for sell/rent. |
| `ResourceInterestRequest` | `resource` FK, `requester` FK User, `message`, `status` (`pending`,`accepted`,`declined`,`cancelled`,`completed`); unique per student per resource |
| `PublicResourceRequest` ("wanted") | `requester` FK User, `title`, `category`, `course`, `desired_exchange_type`, `description`, `status` (`open`,`fulfilled`,`cancelled`) |
| `PublicResourceOffer` | `public_request` FK, `offerer` FK User, `message`, `status` (`pending`,`accepted`,`declined`,`cancelled`); unique per student per request |
| `ResourceChatMessage`, `PublicResourceOfferChatMessage` | parent FK, `sender` FK User, `body`, `image`, `created_at` |

**lost_and_found**

| Model | Columns |
|---|---|
| `LostAndFoundItem` | `poster` FK User, `post_type` (`lost`,`found`), `title`, `category` (`electronics`,`cards_documents`,`stationery`,`clothing`,`accessories`,`keys`,`other`), `location` (free text), `date_lost_or_found`, `description` (max 2000), `image`, `status` (`open`,`claimed`,`resolved`,`cancelled`), timestamps. Indexes: (`status`,`-created_at`), (`post_type`,`status`), (`category`,`status`). |
| `ItemClaim` | `item` FK, `claimant` FK User, `message`, `status` (`pending`,`accepted`,`declined`,`withdrawn`), timestamps |
| `ItemClaimChatMessage` | `claim` FK, `sender` FK User, `body`, `image`, `created_at` |

**peer_tutoring**

| Model | Columns |
|---|---|
| `TutorProfile` | `user` 1:1, `profile_type` (`tutor`,`mentor`,`both`), `headline`, `bio`, `subjects` JSON list, `skills` JSON list, `availability`, `is_free`, `hourly_fee`, `average_rating`, `total_reviews`, `is_active`, timestamps. Indexes: (`profile_type`,`is_active`), (`is_active`,`-average_rating`). |
| `TutoringSession` | `tutor` FK **User**, `learner` FK **User**, `subject_or_skill`, `session_type` (`academic`,`skill_mentorship`,`career_guidance`), `meeting_mode` (`on_campus`,`online`), `location_or_link`, `scheduled_at`, `duration_minutes`, `notes`, `status` (`pending`,`accepted`,`declined`,`cancelled`,`completed`), timestamps. Indexes: (`status`,`-scheduled_at`), (`tutor`,`status`), (`learner`,`status`). |
| `SessionReview` | `session` 1:1, `reviewer` FK User, `tutor` FK **User**, `rating`, `comment`, `created_at` |
| `CollaborationRequest` | `creator` FK User, `title`, `category`, `required_skills` JSON, `description`, `contact_info`, `status` (`open`,`closed`), timestamps |
| `TutoringChatMessage` | `session` FK, `sender` FK User, `body`, `image`, `created_at` |
| `AcademicCourse` | `code` (unique), `title`, `department` FK Department CASCADE, `description`, `is_active`, `created_at` |
| `SkillTopic` | `name` (unique), `category`, `is_active`, `created_at` |

> **Correction to `AI_CHATBOT_PROJECT_AUDIT.md`:** its ER diagram showed `TutoringSession` hanging off `TutorProfile`. Source shows `TutoringSession.tutor` and `SessionReview.tutor` are FKs to **User**, not `TutorProfile` (`peer_tutoring/models.py` L72-80, L128-133). Joins from sessions to tutor profiles go through `user_id`.

**notifications**

| Model | Columns |
|---|---|
| `CampusNotification` | UUID PK, `title`, `message`, `category`, `priority`, `action_url`, `image`, `target_user` FK User (null = broadcast), `created_by` FK User SET_NULL, `created_at`, `is_active` |
| `UserNotificationState` | UUID PK, `user` FK, `notification` FK, `is_popup_dismissed`, `is_read`, `dismissed_at`, `read_at`; unique (`user`,`notification`) |

Django built-ins (`auth_*`, `django_migrations`, `django_session`, `django_admin_log`, `django_content_type`) and four auto-generated M2M tables for library upvotes/bookmarks also exist.

### 3.3 Relationship summary

- Almost every record hangs off `accounts_user` (author/owner/poster/requester/tutor/learner). Departments connect `library_libraryproject`, `peer_tutoring_academiccourse` and `accounts_studentroster`.
- `User` -> person details requires `StudentRoster` (`lower(email)` join).
- Parent/child chains: `Ride -> RideJoinRequest`; `ResourceListing -> ResourceInterestRequest -> ResourceChatMessage`; `PublicResourceRequest -> PublicResourceOffer -> PublicResourceOfferChatMessage`; `LostAndFoundItem -> ItemClaim -> ItemClaimChatMessage`; `TutoringSession -> SessionReview / TutoringChatMessage`; `PrintRequest -> PrintRating`; `CampusNotification -> UserNotificationState`.

---

## 4. Live Neon Verification Status

**Status: NOT VERIFIED. Pending.**

- A local `backend/.env` exists (gitignored; not opened or printed during this audit) and the app connects to Neon with it, but the credentials in it belong to the project's **owner role** (`neondb_owner` per the environment configuration seen in this session's IDE), not a read-only or audit role. Using an owner-level credential for an "audit" does not meet the "authorized read-only access" bar of this phase, so **no database connection was made for the audit**.
- Not run: `information_schema` queries, `pg_roles`/`pg_catalog` queries, `showmigrations`, `makemigrations --check`, `inspectdb`.
- (For transparency: earlier in this session, unrelated to the audit, the app itself was started against Neon and `migrate --check` returned clean. That is not schema verification.)
- No connection string or credential was copied into this document or into any prompt.

**Metadata-only checks to run once a read-only role (or explicit approval) exists** - list for the human to approve:

1. `information_schema.tables` / `columns` for schema `public`: confirm every table in 3.2, column types, nullability, defaults.
2. `pg_indexes`, `information_schema.table_constraints` / `key_column_usage`: confirm FKs, uniques, the indexes listed above.
3. `django_migrations`: confirm the applied set, including the old divergent migration names the `accounts` 0003 docstring mentions.
4. Does `accounts_user` still contain `full_name`, `department`, `enrollment_year` columns (see 3.1)?
5. Do orphaned legacy tables exist (e.g. the old `common_notification`)?
6. `pg_roles` and `information_schema.role_table_grants`: which roles exist, who can `SELECT` what; is the app connecting as owner?
7. `pg_policies` / `relrowsecurity`: confirm no RLS (expected none).
8. `pg_extension` / `pg_available_extensions`: is `pgvector` available (needed later for RAG, not for SQL views).
9. Whether Neon's plan allows creating additional roles and a dedicated connection string for the chatbot role; whether the pooled endpoint supports `SET LOCAL`, `statement_timeout` and `default_transaction_read_only` the way the validator will rely on.

---

## 5. Data-Access and Privacy Matrix

Classes: **C** = student-visible campus data (candidate for restricted SQL view), **P** = personal (user-scoped Django ORM only), **A** = admin-only (never chatbot), **X** = prohibited from LLM context.

### 5.1 Per-feature classification

| Feature / source | Class | Existing visibility rule (evidence) | Allowed columns for chatbot | Aggregation | Safe view feasible | Required exclusion / redaction |
|---|---|---|---|---|---|---|
| Marketplace listings `ResourceListing` | **C** (active only) | `ResourceListingListCreateView.get_queryset` returns `.all()` with **no status filter** (`resource_sharing/views.py` L25-45); any logged-in student sees every listing; serializer exposes owner email/department | `id`, `title`, `category`, `course`, `condition`, `exchange_type`, `price`, `status`, `created_at` | counts/avg price by category, yes | Yes, filter `status='active'` (stricter than API) | exclude `owner_id`, `image`, `description` (free text can hold phone numbers and prompt injection) |
| Marketplace wanted `PublicResourceRequest` | **C** (open only) | list view visible to all authenticated (`views.py` L121-141) | `id`, `title`, `category`, `course`, `desired_exchange_type`, `status`, `created_at` | yes | Yes, `status='open'` | exclude `requester_id`, `description` |
| Marketplace interests/offers/chats | **P** | filtered to requester/owner (`views.py` L197-220, L262-300, L371-390) | n/a (ORM handler only) | n/a | No | chat bodies and images: **X** |
| Lost and found items `LostAndFoundItem` | **C** (open only) | list view `.all()` with annotation, no status filter (`lost_and_found/views.py` L23-45) | `id`, `post_type`, `title`, `category`, `location`, `date_lost_or_found`, `status`, `created_at` | yes (counts by category/location) | Yes, `status='open'` | exclude `poster_id`, `image`, `description` (often holds identifying details used for claim verification) |
| Claims / claim chat | **P** | scoped by claimant/poster (`views.py` L107-165, L202-219) | n/a | n/a | No | message bodies, claimant identity: **X** |
| Library projects `LibraryProject` | **C** (approved only) | `get_queryset` filters `status=APPROVED` (`library/views.py` L19) | `id`, `title`, `department` (short_name), `level`, `created_at`, upvote count | yes | Yes | exclude `author_id`, `github_link` (links to a person), files; `abstract` = decision D3 |
| Library "mine" (all statuses) | **P** | `MyLibraryProjectsView` author filter (`views.py` L76) | n/a | n/a | No | |
| Notes `Note` | **C** | `NoteListCreateView` comment: "No status filter - every note is visible" (`views.py` L105-122) | `id`, `title`, course code, department short_name, `semester`, `created_at`, upvote count | yes | Yes | exclude `author_id`, `description`, files |
| Tutor profiles `TutorProfile` | **C** (active only) | list filters `is_active=True` (`peer_tutoring/views.py` L74); serializer exposes tutor name and email | `id`, `profile_type`, `headline`?, `subjects`, `skills`, `is_free`, `hourly_fee`, `average_rating`, `total_reviews`, `availability`? | yes, but see small-group rule | Yes | exclude `user_id`, name, email, `bio`; `headline`/`availability` = decision D3 |
| Collaboration requests | **C** (open only) | list `.all()`, no status filter (`views.py` L262-276); exposes creator email | `id`, `title`, `category`, `required_skills`, `status`, `created_at` | yes | Yes, `status='open'` | exclude `creator_id`, `contact_info`, `description` |
| Tutoring sessions / reviews / chat | **P** | participant scoping (`views.py` L147-160, 289-308) | n/a | n/a | No | notes, `location_or_link`, chat: **X** |
| Courses `AcademicCourse`, `SkillTopic`, `Department` | **C** (reference data) | public lists (`/api/courses/`, `/api/departments/`, tutoring catalog) | codes, titles, names, `short_name`, `category` | yes | Yes | none beyond `is_active=True` |
| Campus announcements (`CampusNotification` where `target_user` is null and `is_active`) | **C** | student list includes broadcast + own (`notifications/views.py` L34-37) | `id`, `title`, `message`, `category`, `priority`, `created_at` | yes | Yes (broadcast rows only) | exclude `created_by`, `action_url`, `image` |
| Personal notifications / read state | **P** | `target_user=request.user` and `UserNotificationState(user=...)` | via ORM | n/a | No | |
| Ride search / offers `Ride` | **P** (visibility depends on caller) | list filters open + seats>0 **and a same-gender rule that depends on the caller's roster gender** (`rides/views.py` L56-65) | via ORM handler | n/a | **No**: caller-dependent filter cannot live in a static view | `offerer`, GPS: **X** |
| Ride requests, own rides | **P** | offerer/requester scoping (`rides/views.py` L100-113, L207-) | ORM | n/a | No | |
| On-demand rides, driver state | **P** | per-user views | ORM | n/a | No | GPS, plates, `route`: **X** |
| Fare rate `FareSetting` | **C** (optional) | exposed through fare quote endpoint | `rate_per_km` | no | Optional single-row view | none |
| Campus `Location` / `Place` names | **C** | `LocationListView`, `PlaceListView` (authenticated) | `name` only | yes | Optional | `lat`,`lng` excluded in v1 (exact coordinates) |
| Printing requests / ratings | **P** | role/ownership scoping (`printing/views.py` L52-61) | ORM only | n/a | No | `document`, `collection_note`: **X** |
| Printer directory `PrinterProfile` | **P** in v1 | `PrinterListView` visible to students | defer | n/a | Deferred | includes a person's location note; decision D3 |
| Admin Center data (`/api/admin/*`, user lists, moderation) | **A** | `IsPlatformAdmin` (`admin_views.py` L19) | none | none | **Never** | |
| `accounts_user`, `StudentRoster`, `EmailVerification` | **X** (and **A**) | n/a | none | none | **Never** | passwords, OTP, JWTs, email, phone, roll number, gender, enrollment year, full name |

### 5.2 Always prohibited from LLM context (prompt, tool results, logs sent to Gemini)

Passwords/hashes, OTP codes, JWT access and refresh tokens, `DJANGO_SECRET_KEY`, DB credentials, API keys (including the Gemini key itself in any prompt), any student **email**, **phone number**, **roll number**, **full name linked to private activity**, gender, enrollment year, exact GPS (`lat`/`lng`, `last_lat/lng`, `route`, `pickup_*`/`drop_*` coordinates), vehicle `plate_number`, uploaded files and image URLs (`document`, `file`, `image`), chat and message bodies, claim messages, `contact_info`, `collection_note`, other students' internal IDs when joined with private activity.

### 5.3 Row-level security and where ownership is enforced

- **No RLS exists in source or migrations** (no `ENABLE ROW LEVEL SECURITY`, no `CREATE POLICY`, no `RunSQL`). Live status [ASSUME]: expect none; verify via check 7 in section 4.
- **Ownership is enforced only in Django**: queryset filters (`filter(offerer=request.user)` etc.), DRF object permissions (`resource_sharing/permissions.py`, `lost_and_found/permissions.py`, `peer_tutoring/permissions.py`) and WebSocket `connect()` checks. Any direct SQL path bypasses all of it.
- Therefore: a SQL role that can read base tables can read everyone's private rows. The role must not be granted base tables.

---

## 6. Existing Authorization and Security Findings

| # | Finding | Evidence | Impact on chatbot |
|---|---|---|---|
| F1 | No RLS; all authorization is application-level | section 5.3 | SQL must run as a role with views only |
| F2 | Existing APIs return other students' emails in marketplace, lost-and-found, tutoring and claim serializers | `resource_sharing/serializers.py` L41-60; `lost_and_found/serializers.py` L18-35; `peer_tutoring/serializers.py` L50-70 | do not copy these fields into views; chatbot must not become an email directory |
| F3 | Several list views have no status filter (listings, lost-and-found, notes, collaborations) | `resource_sharing/views.py` L44-45; `lost_and_found/views.py` L42-47; `library/views.py` L105-122; `peer_tutoring/views.py` L271-276 | views must add their own `WHERE status=...` |
| F4 | `CORS_ALLOW_ALL_ORIGINS=True` in base; only prod disables it | `base.py` L151, `prod.py` | tighten before exposing a paid endpoint |
| F5 | Default settings module is `dev` (`DEBUG=True`, `ALLOWED_HOSTS=["*"]`) | `manage.py` L9; `asgi.py` L5; `dev.py` | misconfigured deploy runs in debug |
| F6 | Insecure `SECRET_KEY` fallback | `base.py` L16 | require env var |
| F7 | No DRF throttling anywhere | grep for throttle/ratelimit empty | LLM endpoint is a cost-abuse target; add per-user throttle in Phase 2 |
| F8 | OTP via console email backend and `random.randint` | `base.py` L122; `accounts/models.py` ~L130-140 | out of scope, note for hardening |
| F9 | The app connects with what appears to be the owner role | `.env.example` / env naming; section 4 | the chatbot **must not** reuse this connection |
| F10 | Debug roster endpoint is `AllowAny` but mounted only when `DEBUG` | `config/urls.py` L28-35, `accounts/views.py` L187 | ensure DEBUG off in prod |
| F11 | `InMemoryChannelLayer` | `base.py` L76 | irrelevant to SQL path; note for scaling |
| F12 | Test coverage near zero | section 2 | Phase 2 must ship tests for every handler and the validator |
| F13 | Credentials were pasted into chat/IDE during this session (DB password, `DJANGO_SECRET_KEY`) | session | rotate the Neon password and secret key; consistent with the 2026-08-17 note in `docs/history.txt` |

---

## 7. Proposed Safe SQL View Catalog (design only; nothing created)

Proposed schema `chatbot_ro` containing only these views. Names and columns are proposals; each must be re-checked against live metadata (section 4) before creation. Views are owned by an admin role; the chatbot role gets `USAGE` on the schema and `SELECT` on these views only.

| View | Source table | Columns | `WHERE` | Notes |
|---|---|---|---|---|
| `v_market_listings` | `resource_sharing_resourcelisting` | `id`, `title`, `category`, `course`, `condition`, `exchange_type`, `price`, `status`, `created_at` | `status='active'` | |
| `v_market_wanted` | `resource_sharing_publicresourcerequest` | `id`, `title`, `category`, `course`, `desired_exchange_type`, `created_at` | `status='open'` | |
| `v_lost_found_open` | `lost_and_found_lostandfounditem` | `id`, `post_type`, `title`, `category`, `location`, `date_lost_or_found`, `created_at` | `status='open'` | `location` is free text, see D3 |
| `v_library_projects` | `library_libraryproject` + `common_department` | `id`, `title`, `department_short_name`, `level`, `created_at`, `upvote_count` | `status='approved'` | `upvote_count` via subquery on the M2M table |
| `v_library_notes` | `library_note` + `peer_tutoring_academiccourse` + `common_department` | `id`, `title`, `course_code`, `department_short_name`, `semester`, `created_at`, `upvote_count` | none (matches API) | |
| `v_tutors` | `peer_tutoring_tutorprofile` | `id`, `profile_type`, `subjects`, `skills`, `is_free`, `hourly_fee`, `average_rating`, `total_reviews` | `is_active` | no name/email; app deep-links by `id` |
| `v_collab_requests` | `peer_tutoring_collaborationrequest` | `id`, `title`, `category`, `required_skills`, `created_at` | `status='open'` | |
| `v_courses` | `peer_tutoring_academiccourse` + `common_department` | `code`, `title`, `department_short_name` | `is_active` | |
| `v_departments` | `common_department` | `name`, `short_name` | none | |
| `v_skill_topics` | `peer_tutoring_skilltopic` | `name`, `category` | `is_active` | |
| `v_announcements` | `notifications_campusnotification` | `id`, `title`, `message`, `category`, `priority`, `created_at` | `target_user_id IS NULL AND is_active` | |

Not provided as views (handled by ORM or refused): rides, on-demand data, printing, all chats, claims, interest requests, sessions, reviews, notifications state, anything touching `accounts_*`.

Small-group rule: any aggregate over a view returns no group with fewer than N rows (proposal N=3) to avoid re-identifying a single tutor or poster (e.g. "how many tutors for CS-401" returning 1). Enforced in Django on results, not by the model.

---

## 8. Proposed Database Permissions and SQL Validation Design (Phase 2)

### 8.1 Database role (requires Neon verification, section 4 item 9)

1. Create role `chatbot_ro` with `LOGIN`, no `CREATEROLE/CREATEDB/SUPERUSER`, a long random password stored in a **separate** env var (`CHATBOT_DB_URL`), never the owner URL.
2. `REVOKE ALL ON SCHEMA public FROM chatbot_ro;` `GRANT USAGE ON SCHEMA chatbot_ro TO chatbot_ro;` `GRANT SELECT` on the views above only.
3. `ALTER ROLE chatbot_ro SET default_transaction_read_only = on; statement_timeout = '3s'; idle_in_transaction_session_timeout = '5s'; search_path = chatbot_ro;` and `CONNECTION LIMIT` small. Verify Neon's pooler honours role-level settings; if not, issue `SET LOCAL` per transaction.
4. Separate Django DB alias (`DATABASES["chatbot"]`) so the ORM path and SQL path use different credentials.
5. If Neon cannot create roles on this plan: **do not ship SQL mode**; fall back to ORM handlers only.

### 8.2 Validation pipeline (defence in depth; the DB grants are the real boundary)

1. Input: Gemini returns SQL as text. Django never concatenates user text into it.
2. **Parse with a PostgreSQL-aware parser** (candidate: `pglast`, a binding to libpg_query; requires adding a dependency in Phase 2, not now). Reject if parse fails.
3. Require exactly one statement; top-level node must be `SelectStmt`; reject `INTO`, `FOR UPDATE/SHARE`, data-modifying CTEs, `EXPLAIN ANALYZE`, `COPY`, `SET`, `DO`, DDL, `LISTEN`, `CALL`.
4. Walk the AST: every `RangeVar` must be in the allowlist of `chatbot_ro.v_*` with no schema other than `chatbot_ro`; reject `pg_catalog`, `information_schema`, `pg_*`, table functions, `LATERAL` over functions.
5. Column allowlist per view; reject `SELECT *` or expand it to the allowlist.
6. Function allowlist (e.g. `count`, `sum`, `avg`, `min`, `max`, `lower`, `upper`, `coalesce`, `date_trunc`, `now`, `ilike` operators); reject everything else, including `pg_sleep`, `set_config`, `current_setting`, `pg_read_file`, `lo_*`, `dblink`.
7. Enforce `LIMIT` <= 50 by AST rewrite; reject `OFFSET` beyond a cap; cap nesting depth and node count.
8. Execute in a read-only transaction on the `chatbot` alias with the role's timeouts; cap rows and serialized size (e.g. 50 rows / 16 KB).
9. Apply the small-group rule and column redaction to results before returning anything to Gemini.
10. Log (user id, question hash, SQL, rowcount, latency, outcome) without result values.

### 8.3 Limitations of parser validation

- Parser validation cannot decide *semantics* (e.g. an expensive cross join of allowed views), only structure; timeouts and row caps cover that.
- Parser or Postgres version skew can create gaps, so the allowlist is closed by default.
- Prompt injection can steer Gemini toward odd but still allowed queries; because views contain only campus-visible columns, the worst case is reading data a student can already see.
- The validator is not the security boundary. **The role's grants are.** If the validator has a bug, the role still cannot read base tables, write, or see other students' private rows.

### 8.4 Personal data

Fixed ORM handlers, one per question type, each taking `request.user` (never a model-supplied id), returning an allowlisted dict. Gemini selects a handler and arguments (enums, bounded dates/ints) via function calling; Django validates arguments with DRF serializers. No SQL, no free-form model-chosen filters.

### 8.5 Secrets

The Gemini API key is server-side only (`GEMINI_API_KEY` env), never sent to the mobile app, never included in prompts, never logged. No DB credentials or connection strings are ever placed in a prompt. Schema text sent to Gemini is generated from the view catalog, not from live introspection of base tables.

---

## 9. Ten Pilot Questions

| # | Question | Method | Data / source | Why |
|---|---|---|---|---|
| 1 | "Are there any free books for CS-201 on the marketplace?" | **SQL view** | `v_market_listings` (`category`, `course`, `exchange_type='free'`) | campus-wide, no personal columns |
| 2 | "Which lost-and-found items were reported this week?" | **SQL view** | `v_lost_found_open` (`created_at`, `category`) | public discovery; description and poster excluded |
| 3 | "Show approved FYP projects from Software Engineering." | **SQL view** | `v_library_projects` (`level='fyp'`, `department_short_name`) | approved, public content |
| 4 | "Which notes have the most upvotes for CS-201?" | **SQL view** | `v_library_notes` (`upvote_count`, `course_code`) | aggregation over public data |
| 5 | "Are any free tutors available for Financial Accounting?" | **SQL view** | `v_tutors` (`subjects`, `is_free`, `average_rating`) | no identity; answer points to the Tutors screen |
| 6 | "What events or announcements were posted recently?" | **SQL view** | `v_announcements` | broadcast rows only |
| 7 | "What is the status of my print job?" | **ORM handler** | `PrintRequest` filtered by `requester=request.user` | personal; owner-scoped in `printing/views.py` L54-61; never SQL |
| 8 | "When is my next tutoring session?" | **ORM handler** | `TutoringSession` for `tutor=user` or `learner=user`, `status=accepted`, `scheduled_at>=now` | personal (`peer_tutoring/views.py` L147-160); exclude link/notes |
| 9 | "Did anyone accept my ride request?" | **ORM handler** | `RideJoinRequest(requester=user)` + `Ride` | personal; ride search rules depend on caller gender |
| 10 | "What is Ayesha's phone number / where does Ahmed live / show me chat with the seller?" | **Refuse / redirect** | none | phone, roll number, location, chat bodies are prohibited; direct user to in-app request/chat flow |

Also refuse: admin statistics from a student account, "list all students", anything on OTP/password/token, and requests to run arbitrary SQL.

---

## 10. Phase 2 Implementation Checklist

Prerequisites (human actions):
- [ ] Approve and run the read-only metadata checks in section 4; update this doc with [LIVE] results.
- [ ] Confirm Neon plan can create roles / a second connection string; decide fallback (ORM-only) if not.
- [ ] Rotate Neon password and `DJANGO_SECRET_KEY`; obtain a Gemini key stored only in env.
- [ ] Resolve decisions D1-D6 (section 11).

Implementation:
- [ ] New Django app `assistant` under `backend/apps/` (follow existing app layout); register in `INSTALLED_APPS` and `config/urls.py`.
- [ ] Write `docs/api-contracts/assistant.md` first (repo convention), then implement `POST /api/assistant/chat/` with `IsAuthenticated`.
- [ ] DRF throttles (per user/minute and per day) and request-size limits.
- [ ] Gemini client wrapper with timeout, `max_output_tokens`, tool/function-calling, no key logging.
- [ ] Router: classify into SQL-view / ORM-handler / refuse; function schema lists only approved handlers.
- [ ] ORM handlers for questions 7-9 and other personal intents, each unit-tested for cross-user isolation.
- [ ] Hand-written migration (RunSQL) creating schema `chatbot_ro`, views, role, grants; reviewed by a human; applied manually to Neon.
- [ ] `DATABASES["chatbot"]` alias using `CHATBOT_DB_URL`.
- [ ] `sql_guard` module using the AST allowlist in 8.2, plus tests: multi-statement, CTE writes, `pg_sleep`, catalog access, `SELECT *`, unions with base tables, comments/unicode tricks, `LIMIT` bypass.
- [ ] Result post-processing: row/size caps, small-group rule, redaction pass.
- [ ] Conversation storage (user-owned), last-N-turn window; do not store raw result sets.
- [ ] Prompt-injection hardening: delimiters, "data not instructions", no tool that writes.
- [ ] Mobile: chat screen under `mobile/src/features/assistant/{data,presentation}` plus thin route in `mobile/app/(app)/`, reusing `apiClient` and the existing chat screen layout; vector icons, no emoji (the root rules file).
- [ ] Tests: validator, handlers, isolation, throttling, refusal cases; fix `makemigrations --check` cleanliness.
- [ ] Update `docs/documentation.txt` and `docs/history.txt` (developer name required by the root rules file).

---

## 11. Unresolved Decisions and Risks

| ID | Decision / risk | Needs |
|---|---|---|
| D1 | Do we have approval for read-only metadata inspection of Neon, and with which role? | owner |
| D2 | Can Neon create the `chatbot_ro` role and a separate connection string on the current plan? | owner / Neon console |
| D3 | Free-text columns (`description`, `abstract`, `headline`, `availability`, `location`): exclude, truncate or allow? They may contain phone numbers or injected instructions. Default in this spec: exclude except `location` and `title` | product owner |
| D4 | May tutor/poster **names** ever be shown? Default: no, deep-link to in-app screens | product owner |
| D5 | Small-group minimum N for aggregates (proposed 3) | product owner |
| D6 | Tighten APIs too (e.g. stop returning `*_email` in serializers)? Outside chatbot scope but related to F2 | product owner |
| D7 | Whether live schema equals models (3.1); may force view definitions to change | section 4 |
| D8 | Adding `pglast` (or another Postgres parser) as a dependency | approval in Phase 2 |
| D9 | LLM data-handling: Gemini receives user questions and view results. Confirm data-sharing policy with the university | owner |
| D10 | Cost and quota limits for Gemini | owner |
| R1 | Prompt injection through user-authored text surfacing in results | excluded text columns, delimiters, no write tools |
| R2 | Misconfigured prod settings (F4-F6) before launch | harden first |
| R3 | Single shared Neon DB for both developers and test data | consider a separate dev branch/database for chatbot work |

---

## 12. Evidence References

| Claim | Reference |
|---|---|
| Settings: DB, JWT, CORS, secret key | `backend/config/settings/base.py` L16, L78-97, L125-141, L151, L157 |
| Default settings module | `backend/manage.py` L9; `backend/config/asgi.py` L5; `backend/config/settings/dev.py` |
| URL routing | `backend/config/urls.py` L8-27; debug route L28-35 |
| `User`, roles, admin promotion, roster-derived properties | `backend/accounts/models.py` L30-101 |
| `StudentRoster`, `EmailVerification` | `backend/accounts/models.py` L134-163 |
| State-only merge migration | `backend/accounts/migrations/0003_merge_salman_zahra_state.py` |
| `AcademicCourse` table move | `backend/common/migrations/0003_academiccourse.py` L46; `0005_drop_academiccourse_pointer.py` |
| Notification model move | `backend/common/migrations/0004_notifications_to_campus.py` L26-30 |
| Library visibility | `backend/apps/library/views.py` L19 (projects approved only), L105-122 (notes no filter), L76 (mine) |
| Marketplace visibility | `backend/apps/resource_sharing/views.py` L25-45, L121-141, L197-220, L262-300, L371-390 |
| Marketplace models, indexes | `backend/apps/resource_sharing/models.py` L10-82 |
| Lost and found visibility | `backend/apps/lost_and_found/views.py` L23-60, L107-165, L202-219 |
| Tutoring visibility, sessions, collaborations | `backend/apps/peer_tutoring/views.py` L61-110, L139-160, L262-308 |
| Tutoring models, FK targets | `backend/apps/peer_tutoring/models.py` L6-60 (TutorProfile), L55-115 (TutoringSession), L117-142 (SessionReview), L144-175, L216-260 |
| Rides visibility and gender rule | `backend/apps/rides/views.py` L50-65, L100-113, L207- |
| Printing visibility | `backend/apps/printing/views.py` L29-61 |
| Notifications list | `backend/apps/notifications/views.py` L23-40; model L6-70 |
| Serializer exposure of emails | `backend/apps/resource_sharing/serializers.py` L41-60, L147-161; `backend/apps/lost_and_found/serializers.py` L18-35, L84-100; `backend/apps/peer_tutoring/serializers.py` L50-70, L113-134 |
| Ownership permission classes | `backend/apps/resource_sharing/permissions.py`; `lost_and_found/permissions.py`; `peer_tutoring/permissions.py` |
| Admin permission | `backend/accounts/admin_views.py` L19-31 |
| WebSocket auth | `backend/apps/resource_sharing/websocket_auth.py` |
| Mobile API client | `mobile/src/core/network/apiClient.ts` L7-60 |
| Mobile chat UI to reuse | `mobile/app/(app)/tutoring/chat/[sessionId].tsx` |
| Planned (unbuilt) RAG | `docs/system_design.md` L13, L82-85 |
| Repo conventions | the root rules file (frozen app labels, API contract first, history log, no emoji) |
