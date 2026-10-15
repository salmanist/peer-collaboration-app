# API Contract — Digital Library

Base path: `/api/library/`.
Auth: JWT bearer token on every endpoint here.

Once the backend is running, `/api/docs/` (Swagger UI) is the live, always-current version — treat this file as the pre-build reference.

## Project object shape

```json
{
  "id": 1,
  "author": { "id": 3, "email": "ali.raza@lgu.edu.pk", "full_name": "Ali Raza" },
  "title": "Low-Cost Water Quality Sensor for Rural Punjab",
  "department": "EE",
  "abstract": "A field-deployable IoT sensor measuring turbidity and pH...",
  "document": "http://localhost:8000/media/library/documents/report.pdf",
  "status": "approved",
  "created_at": "2026-08-12T09:00:00Z",
  "upvote_count": 34,
  "is_upvoted": false,
  "is_bookmarked": false
}
```

`status` is `"pending"`, `"approved"`, or `"rejected"` — set by a moderator via Django admin (bulk "Approve"/"Reject" actions), never by the API. `is_upvoted`/`is_bookmarked` reflect the calling user only.

## GET `library/`

Auth: required. Lists **approved** projects only, newest first.

Query params (optional):
- `?department=<text>` — exact match, case-insensitive.
- `?search=<text>` — substring match against title or abstract.

Response `200`: paginated list of project objects.

## POST `library/`

Auth: required. `multipart/form-data` (file upload). Creates a project with `author` set to the caller and `status` forced to `"pending"` regardless of what's sent.

Request fields: `title`, `department`, `abstract`, `document` (PDF/file).

Response `201`: the created project object (`status: "pending"`).

## GET `library/mine/`

Auth: required. Lists every project the caller has submitted, any status, newest first — so an author can track pending/rejected submissions the public list hides.

Response `200`: paginated list of project objects.

## GET `library/<id>/`

Auth: required. Returns a single project regardless of status.

## POST `library/<id>/upvote/`

Auth: required. No request body. Toggles the caller's upvote (adds if absent, removes if present).

Response `200`: the updated project object.

## POST `library/<id>/bookmark/`

Auth: required. No request body. Toggles the caller's bookmark the same way.

Response `200`: the updated project object.
