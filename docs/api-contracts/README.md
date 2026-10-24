# API overview (all under /api/)

Auth: `auth/` register, verify-email, forgot-password, reset-password, login, refresh, me (GET). Details: `auth.md`.
Shared: `departments/` (alias `common/departments/`), `courses/`, `schema/`, `docs/` (Swagger).
Rides: `rides/` (see `rides.md`) and `ondemand/` (places, fare, profile, driver, rides/...).
Library: `library/` projects + `library/notes/` (see `library.md`).
Chatbot: `chatbot/ask/` (POST question, see `chatbot.md`).
Printing: `printing/` (open pool, mine, printers, accept/reject/release/complete/cancel/rate).
Marketplace: `resources/` listings, requests, wanted + offers, summary.
Lost & Found: `lost-and-found/` items, claims, claim chat, summary.
Tutoring: `tutoring/` catalog, tutors, sessions, reviews, collaborations, summary.
Notifications: `notifications/` list, dismiss-popup, mark-read, mark-all-read, admin broadcast (admin only).
Admin API: `admin/` overview, marketplace, lost-and-found, tutoring, users, catalog (platform admins only).
WebSockets (chat): `ws/resources/requests/<id>/chat/`, `ws/resources/offers/<id>/chat/`, `ws/lost-and-found/claims/<id>/chat/`, `ws/tutoring/sessions/<id>/chat/` (JWT as `?token=`).
Swagger at `/api/docs/` is the source of truth.
