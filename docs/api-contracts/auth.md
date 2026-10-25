# API Contract — User Profiles + Auth

Base path: `/api/auth/`
Auth scheme: JWT bearer token (`Authorization: Bearer <access>`), issued by `djangorestframework-simplejwt`.
Only `@lgu.edu.pk` email addresses that also appear on the official student roster (`accounts.StudentRoster`, loaded via `manage.py import_roster <csv>`) may register — the domain suffix alone isn't enough. The roster stands in for a real university records API: it carries `full_name`/`department`/`enrollment_year`/`gender`, and all four are resolved live from the matched `StudentRoster` row on every read, never stored on the account — so there's no stale/tamperable copy on `accounts.User`. Registration only ever collects `email` + `password`.

Once the backend is running, the live, always-current version of this is at `/api/docs/` (Swagger UI) — treat this file as the pre-build reference, Swagger as the source of truth afterwards.

## POST `register/`

Auth: none.

Request:
```json
{
  "email": "ali.raza@lgu.edu.pk",
  "password": "SuperSecure123!"
}
```

`full_name`, `department`, `enrollment_year`, `gender` are not part of the request — they're resolved from the matched `StudentRoster` row at read time, not stored on the account.

Response `201`:
```json
{ "detail": "Registered. Check your email for a verification code." }
```

Response `400` — bad domain, not on the roster, weak password, or email already registered:
```json
{ "email": ["Registration is only open to @lgu.edu.pk email addresses."] }
```
```json
{ "email": ["This email isn't on the official LGU student roster. Contact your department if this is a mistake."] }
```

Account is created inactive (`is_active=false`) until verified. A 6-digit OTP is emailed (console-logged in dev), expires in 15 minutes.

## POST `verify-email/`

Auth: none.

Request:
```json
{ "email": "ali.raza@lgu.edu.pk", "code": "505945" }
```

Response `200`:
```json
{ "detail": "Email verified. You can now log in." }
```

Response `400` — wrong/expired code or unknown email:
```json
{ "detail": "Invalid or expired code." }
```

## POST `login/`

Auth: none.

Request:
```json
{ "email": "ali.raza@lgu.edu.pk", "password": "SuperSecure123!" }
```

Response `200`:
```json
{
  "access": "<jwt>",
  "refresh": "<jwt>",
  "user": {
    "id": 1,
    "email": "ali.raza@lgu.edu.pk",
    "full_name": "Ali Raza",
    "department": "CS",
    "enrollment_year": 2023,
    "gender": "male",
    "role": "student",
    "is_email_verified": true,
    "created_at": "2026-08-07T07:03:41.939998Z"
  }
}
```

Response `401` — wrong credentials, or account not yet verified (same message either way, so unverified accounts aren't distinguishable from wrong passwords to an attacker):
```json
{ "detail": "No active account found with the given credentials" }
```

## POST `refresh/`

Auth: none (body carries the refresh token).

Request:
```json
{ "refresh": "<jwt>" }
```

Response `200`:
```json
{ "access": "<jwt>", "refresh": "<jwt>" }
```

Refresh tokens rotate on use — always store the new one returned here.

## GET `me/`

Auth: required.

Response `200`: same `user` object shape as in `login/`.

Every field on `accounts.User` is now either roster-derived (`full_name`, `department`, `enrollment_year`, `gender`) or otherwise not self-editable (`email`, `role`, `is_email_verified`), so there's nothing left for a student to PATCH — `me/` is read-only (`GET` only; `PATCH`/`PUT` return `405`). If a future module needs an editable profile field, add it here deliberately rather than reopening this endpoint by default.

## Token lifetimes

- Access: 30 minutes.
- Refresh: 14 days, rotates on every use.

## Fields every other module can rely on (`accounts.User`)

`id`, `email`, `full_name`, `department`, `enrollment_year`, `gender` (`male`/`female`/`""`), `role` (`student`/`admin`), `is_email_verified`, `is_active`, `created_at`. FK into this via `settings.AUTH_USER_MODEL`, never a hardcoded app label. `full_name`/`department`/`enrollment_year`/`gender` are all derived from `StudentRoster` by email match on every read, not stored on `accounts.User` — treat them as read-only wherever you consume this model.

## Dummy dataset (simulated university API)

`backend/accounts/fixtures/dummy_students.csv` — 30 sample students (mixed department/year/gender) standing in for a real university records feed. Load with `python manage.py import_roster backend/accounts/fixtures/dummy_students.csv` before registering test accounts.

## Forgot / reset password

- `POST auth/forgot-password/` body `{ "email": "<roll>@lgu.edu.pk" }`. Emails a 6-digit code (valid 15 minutes) to that university address. `404` if no account. `429` after 3 requests per email in 15 minutes. In development with no SMTP configured the response also carries `debug_otp`.
- `POST auth/reset-password/` body `{ "email", "code", "new_password" }` (min 6 chars). `400` for a wrong or expired code. `429` after 5 wrong codes per email (locked for 15 minutes).

## Sign-up code: email first, text message second

- `POST auth/register/` now emails the 6-digit code to the student's university address (no text message). Response: `{ detail, sms_available, phone_number (masked, only when sms_available), debug_otp (dev only) }`. `sms_available` is true only when the server has an SMS provider (`SMS_ENABLED`) and this student has a phone on file; the app shows the phone option only then.
- `POST auth/resend-code/` body `{ "email", "channel": "email" | "sms" }` (default email). `400` if already verified or SMS unavailable, `404` unknown email, `429` after 3 requests per email in 15 minutes.
