# System Design — Academic Peer Collaboration and Networking System

Reference architecture for the whole app. Every module (built independently, sometimes by different people/tools) is built against this document. Full functional/non-functional requirements live in `SRS.md`; this doc covers the *how*, not the *what*.

## 1. Overview & Stack

Mobile-first platform for Lahore Garrison University students, gated by institutional email verification, covering 9 functional surfaces: User Profiles (base), Ride Sharing, Resource Sharing, Peer Tutoring & Mentorship, Lost & Found, Digital Library, Community & Announcements, Printing Services, AI Chatbot.

Institutional email domain for registration/verification: **`lgu.edu.pk`** — any registration email not ending in `@lgu.edu.pk` is rejected.

- **Mobile:** React Native + Expo (managed workflow, EAS Build), TypeScript
- **Backend:** Django + Django REST Framework
- **Database:** PostgreSQL (+ pgvector extension for the chatbot's retrieval index)
- **Mobile state:** Zustand
- **Auth:** JWT (`djangorestframework-simplejwt`)
- **Push notifications:** FCM (Firebase Cloud Messaging)

## 2. Monorepo Layout

```
/mobile                  Expo (TypeScript) app
/backend                 Django project
/docs/api-contracts/     one .md per module, written before/alongside code
/docs/decisions/         short 1-paragraph ADRs
```

One repo, one CI pipeline, one place for API contracts — atomic PRs when a mobile change and its backend counterpart land together.

## 3. Mobile Architecture

Expo Router (file-based routing, current Expo default) — `app/` is a thin routing layer only, real code lives under `src/`, organized feature-first:

```
mobile/
  app/                    # routes only — import screens from src/features/*
  src/
    core/                 # network/apiClient.ts, auth/session.ts, theming/, constants/
    features/
      <feature>/
        data/             # API calls on core's client
        presentation/     # screens/components
        <feature>.ts      # barrel file — the ONLY thing other code may import
```

**Rule:** a feature imports `core/` and its own folder only — never another feature's internals directly. Enforce with a small CI script that greps `src/features/*/` for imports of another feature's non-barrel files and fails the build. (Deferred until a second feature exists — nothing to violate with only `auth` built.)

## 4. Backend Architecture

Django, app-per-module, `accounts` + `common` as the shared base:

```
backend/
  config/settings/{base,dev,prod}.py, urls.py
  accounts/    # custom User model — the foundation app, built first
  common/      # pagination, permissions, storage.save_upload(), notifications.notify(),
               # generic Report model, generic Thread/Message model
               # (added when the first module that needs them is built, not upfront)
  apps/
    rides/ resources/ tutoring/ lostfound/ library/ community/ printing/ chatbot/
```

**Rule:** feature apps never import another feature app's models directly (except FKs to `accounts.User`, always allowed). Cross-feature reads go through a named `services.py` function — that function signature *is* the contract, documented in `docs/api-contracts/`.

## 5. API Contract-First Workflow

1. Before/at the start of a module, write `docs/api-contracts/<module>.md`: endpoints, method, path, auth, request/response JSON examples, pagination/filter params.
2. This unblocks parallel start — mobile builds against the agreed shape (mock data) while backend builds the real endpoint.
3. Once real, `drf-spectacular` gives a live OpenAPI schema + Swagger UI — from then on, **Swagger is the source of truth**, not the markdown. Don't hand-maintain both.

## 6. Shared Conventions (fixed once, never reinvented per-module)

- **Auth:** JWT via `djangorestframework-simplejwt`, endpoints `/api/auth/{register,verify-email,login,refresh,me}/`.
- **Pagination:** DRF `PageNumberPagination` → `{count, next, previous, results}`.
- **Filtering:** `django-filter` + DRF `SearchFilter` (`?category=&course=&search=&page=`).
- **File uploads:** always through `common.storage.save_upload()` — local disk/`MEDIA_ROOT` during the build; real S3-style storage (`django-storages`) deferred to hardening if time allows.
- **Messaging:** one generic `Thread`/`Message` model in `common` (content-type + object-id), reused by Resource Sharing, Lost & Found, and Community — not three independent chat implementations.
- **Notifications:** centralized `common.notifications.notify()`, FCM-backed — nothing in the SRS needs a duplex channel, so no Django Channels/WebSockets.
- **Moderation:** Django's built-in `django.contrib.admin` with `status` fields + admin actions — no custom admin panel.

## 7. AI Chatbot / RAG Architecture

- **pgvector** Postgres extension — zero new infrastructure, fits the corpus size (low thousands of chunks), keeps the "encrypted, access-controlled DB" story to one system.
- Curated institutional docs (handbook excerpts, registration steps, available tools) chunked into ~500-token pieces with overlap; hand-rolled, no LangChain/LlamaIndex.
- One embeddings+LLM provider picked up front (has budget-approval lead time).
- Retrieval: top-k cosine similarity via `pgvector.django.VectorField`, `source_category` field (`policy`/`registration`/`tools`/`courses`/`digital_library`).
- **Anti-hallucination (REQ AI 04):** system prompt constrains answers to retrieved context, **plus** a hard similarity-threshold gate (cosine < 0.75 → skip the LLM call, return a canned "I don't have reliable information on that" response) — don't rely on the LLM's honesty alone.
- **Project idea suggestions (REQ AI 03):** same table, `source_category='digital_library'`, generated from each project's title/summary/domain/tech-stack at approval time via a Django signal.
- **Updatable KB (REQ AI 05):** manual `manage.py reindex_kb` command against curated text files.

## 8. SRS Corrections Applied

Decisions made to close gaps/bugs found in `SRS.md`, documented here rather than left implicit:

- **Ratings ERD bug:** `Rating` FKs to `TutoringSession` (which itself FKs tutor + student), not directly to tutor/student — the SRS diagram's direct FK would let ratings be duplicated or unlinked from a specific session, undermining REQ PT 05.
- **No admin app planned in SRS §2.3**, yet moderation is required (Digital Library approval REQ DL 04, reports on listings/posts/users §5.5) — resolved via `django.contrib.admin`.
- **Real-time mechanism unnamed in SRS §3.4** — resolved as FCM push, not Django Channels/WebSockets.
- **File/image storage location vague** ("cloud storage platforms," §3.3) — resolved via `common.storage.save_upload()`, backed by local disk during the build.
- **Account deactivation on graduation (§5.5)** has no institutional data feed to sync against — resolved as a manual `is_active` toggle in Django admin, documented as a known limitation.
- **300–500 concurrent users (NFR)** won't be genuinely validated on this timeline/budget — demonstrate the load-testing *approach* at reduced scale (locust/k6, ~50–100 concurrent), record actual numbers rather than asserting the NFR is met.

## 9. Named Scope Cuts

Stated explicitly — deliberate engineering judgment, not gaps:

- **Printing:** workflow + admin-simulated status only, no hardware/printer integration (permanent boundary, not a time cut).
- **Ride matching:** text route + time window, not GPS polyline overlap.
- **"Sale" listings:** in-app contact only, zero payment processing (also mandated by SRS §5.5).
- **Moderation:** Django admin only, no custom panel.
- **Chatbot KB:** curated manual corpus + manual reindex, not live crawling.
- **Offline support:** recently-viewed cache only, not offline-first.

## 10. Build Order

1. **User Profiles** (Auth/Profile) — hard dependency for every other module.
2. **SRS High-priority:** Ride Sharing, Resource Sharing, Peer Tutoring, AI Chatbot.
3. **SRS Medium-priority:** Lost & Found, Digital Library, Community & Announcements, Printing Services.

Digital Library is pulled slightly earlier within its tier because the Chatbot's project-idea suggestions (REQ AI 03) depend on it.

## 11. Critical Files (per module, once built)

The files that define a module's contract — get these right before parallel work starts on anything that depends on them:

- `backend/config/settings/base.py` — DB config, installed apps, JWT settings.
- `backend/accounts/models.py` — `User`, every other app FKs into this.
- `mobile/src/core/network/apiClient.ts` — shared client every feature reuses.
- `mobile/src/core/auth/session.ts` — session state every feature reads.
- `docs/api-contracts/auth.md` — first contract, template for the rest.
- `backend/common/notifications.py` (`notify()`) and `backend/common/models.py` (generic `Thread`/`Message`, `Report`) — added when Resource Sharing (first module needing messaging) is built.
