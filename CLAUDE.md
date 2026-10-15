# FellOo - LGU peer collaboration app (merged)

React Native (Expo 57) app + Django REST backend on one shared Neon Postgres. Layout (repo root): `backend`, `mobile`, `docs`. Run: `run.bat` (backend :8000, Expo web). Details: `docs/documentation.txt`, `docs/system_design.md`, `docs/SRS.md`, `docs/api-contracts/`.

## Session rules
1. On the very first prompt of each session, ask "who are you?" with two options: salman or zahra.
   - salman: User profiles + Auth, Ride sharing (+ on-demand), Digital library, Printing.
   - zahra: Resource sharing (Marketplace), Lost and found, Peer tutoring, Notifications, Admin Center.
2. Document system behaviour in `docs/documentation.txt`.
3. Log every change in `docs/history.txt` as a journal entry: date, time, developer name (salman/zahra), plain English, compact.
4. Sync all knowledge/data notes of this app to `D:\Code Creations\Projects\obsidian-vault\FYP-app`. If the folder is missing, skip and tell the user.
5. The word "claude" must not appear anywhere in the repo except in CLAUDE.md files.

## Architecture
- Modules are independent lego blocks; everything depends on the User Profiles base (`accounts`).
- Backend: one Django app per module under `backend/apps/`; `accounts` and `common` are shared. Apps never import each other's models except FKs to User (known exception: `common` and `library` read `peer_tutoring.AcademicCourse`). App labels are frozen - they match existing Neon tables. Notifications go through `common.notifications.notify()`. Admins come from the `ADMIN_EMAILS` env var.
- Mobile: expo-router routes in `` are thin re-exports; code lives in `src/features/<feature>/{data,presentation}` with a barrel file; features import only `src/core/` and themselves.
- Database: Neon is the source of truth. Check `information_schema` before touching migrations, never hand-edit applied migrations, never drop tables on the shared DB. `makemigrations --check` must stay clean.
- Write the API contract in `docs/api-contracts/` first; Swagger (`/api/docs/`) is authoritative afterwards.
- Chat uses Django Channels WebSockets (zahra's modules); other modules poll.

## Code rules
- Efficient, optimized code; good variable names; a bit of naivety in the code so it passes AI checks; mark deliberate shortcuts with a `ponytail:` comment.
- Always use vector icons (MaterialCommunityIcons / @expo/vector-icons), never emojis.
- Frontend standard: canvas `#F8FAFC`, unboxed headers; cards radius 20, white, border `#F1F5F9`, shadowOpacity 0.04, shadowRadius 8, elevation 2; deep emerald `#0D3E02` for headings/brand surfaces, gold `#FDBF1E` for primary CTAs; headings weight 800/900 with letterSpacing -0.3, secondary text 500/600; generous padding. (Salman's older screens use `core/ui/theme.ts`; unify toward this standard.)
- Check for syntax errors first when hunting layout breaks.
- Expo has changed: read https://docs.expo.dev/versions/v57.0.0/ before writing Expo code.

## Gotchas
- Windows: a stopped runserver/node can keep holding its port (check `netstat`). New files in new folders may need an Expo restart.
- Expo reads `EXPO_PUBLIC_*` only at boot. Test accounts are dev-only; a roster entry is required before registering.
