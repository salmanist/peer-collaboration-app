# API Contract — Ride Sharing (+ Notifications)

Base path: `/api/rides/` (and `/api/notifications/` for the shared notification feed).
Auth: JWT bearer token on every endpoint here — no `AllowAny` views in this module.

Once the backend is running, `/api/docs/` (Swagger UI) is the live, always-current version — treat this file as the pre-build reference.

## Ride object shape

```json
{
  "id": 1,
  "offerer": { "id": 3, "email": "ali.raza@lgu.edu.pk", "full_name": "Ali Raza" },
  "departure": "DHA Phase 5",
  "destination": "LGU Campus",
  "departure_lat": null,
  "departure_lng": null,
  "destination_lat": null,
  "destination_lng": null,
  "departure_date": "2026-08-20",
  "departure_time": "08:30:00",
  "seats_total": 3,
  "seats_available": 2,
  "same_gender_only": false,
  "is_cancelled": false,
  "my_request_status": null,
  "created_at": "2026-08-12T09:00:00Z"
}
```

`my_request_status` is `null`, `"pending"`, `"accepted"`, or `"declined"` — the requesting user's own join request on this ride, if any. Always `null` for the offerer's own ride.

`departure_lat`/`departure_lng`/`destination_lat`/`destination_lng` are a best-effort client-side geocode of the typed address (via the mobile app's `expo-location` geocoding — no Google Maps, no API key, no cost). They're nullable and never guaranteed: `null` whenever geocoding wasn't possible (no permission, no network, unresolvable address). No UI renders a map with them — they exist purely to power proximity search below.

## GET `rides/`

Auth: required. Lists open rides (`seats_available > 0`, not cancelled), ordered by `departure_date`, `departure_time`.

Query params (all optional, combine with AND):
- `?departure=<text>` — substring match, case-insensitive.
- `?destination=<text>` — substring match, case-insensitive.
- `?date=YYYY-MM-DD` — exact match on `departure_date`.
- `?departure_lat=&departure_lng=` — proximity match instead of substring for the departure leg (see below).
- `?destination_lat=&destination_lng=` — same, for the destination leg.
- `?radius_km=<number>` — proximity radius, default `5`. Only meaningful alongside the coordinate params above.

**Coordinates are additive precision on top of text search, never a replacement for it.** When a leg's lat/lng are supplied: a ride whose matching leg was itself geocoded is included if it's within `radius_km`; a ride whose matching leg was never geocoded (`null` coordinates) falls back to substring-matching that leg's text param instead, so an ungeocoded ride is never silently dropped from results just because the searcher's client resolved coordinates and it didn't. Omit the coordinate params entirely to get the original plain substring behavior.

A ride with `same_gender_only: true` is only included for a caller whose `gender` matches the offerer's — never shown to a mismatched or blank-gender caller.

Response `200`: paginated list of ride objects.

## POST `rides/`

Auth: required. Creates a ride with `offerer` set to the caller; `seats_available` is set to `seats_total` automatically.

Request:
```json
{
  "departure": "DHA Phase 5",
  "destination": "LGU Campus",
  "departure_lat": 31.4697,
  "departure_lng": 74.4142,
  "destination_lat": 31.4805,
  "destination_lng": 74.3573,
  "departure_date": "2026-08-20",
  "departure_time": "08:30:00",
  "seats_total": 3,
  "same_gender_only": false
}
```

`seats_total`: 1–8. `departure_date`: must not be in the past. `same_gender_only: true` requires the caller to have a `gender` set on their account (roster-sourced) — otherwise `400`.

`departure_lat`/`departure_lng`/`destination_lat`/`destination_lng` are optional and carry an exact map pin for that leg.
- No coordinates: `departure`/`destination` must be a curated `Location` name; its curated coordinates are stored.
- Curated name + pin: the curated name is kept and the pin coordinates are stored, but the pin must be within 5 km of that area, otherwise `400` ("Pin is too far from the chosen area.").
- Pin only (name not curated): the name is used as the label (e.g. "Pinned on map") and the point must lie inside the Lahore bounding box (lat 31.2-31.8, lng 73.9-74.7), otherwise `400`.
- A lat without its lng (or vice versa) for the same leg is `400`.

Response `201`: the created ride object.

## GET `rides/mine/`

Auth: required. Lists every ride the caller has offered, newest first — unlike `GET rides/`, this includes full and cancelled rides so an offerer can see their own posting history, not just what's currently open.

Response `200`: paginated list of ride objects.

## GET `rides/<id>/`

Auth: required. Returns a single ride, regardless of gender restriction or seat availability (so a party to an existing request can still see it).

## POST `rides/<id>/join/`

Auth: required. No request body. Creates a pending join request from the caller.

Response `201`:
```json
{ "id": 5, "ride": 1, "requester": { "id": 7, "email": "...", "full_name": "..." }, "status": "pending", "created_at": "..." }
```

Response `400`:
- `{"detail": "You can't request to join your own ride."}`
- `{"detail": "This ride is full."}`
- `{"detail": "This ride is only open to riders of the same gender."}`
- `{"detail": "You've already requested to join this ride."}`

Notifies the offerer.

## POST `rides/<id>/cancel/`

Auth: required, offerer only.

Response `200`: the ride object (`is_cancelled: true`). Notifies every rider with a still-pending request.

Response `403` (not the offerer) / `400` (already cancelled, or already has an accepted rider — can't cancel on someone who's confirmed).

## GET `rides/<id>/requests/`

Auth: required, offerer only (`403` otherwise). Lists join requests on this ride, newest first.

Response `200`: paginated list of join-request objects (each nests `requester`).

## POST `rides/requests/<id>/accept/`

Auth: required, offerer only. Accepts a pending request: decrements `seats_available`, notifies the requester. Race-safe against simultaneous accepts on the last seat.

Response `200`:
```json
{ "ride": { ... full ride object ... }, "join_request": { ... full join-request object with requester contact info ... } }
```

Response `403` (not the offerer) / `400` (already handled, or ride is full).

## POST `rides/requests/<id>/decline/`

Auth: required, offerer only. Declines a pending request, notifies the requester.

Response `200`: the join-request object (`status: "declined"`). Response `403` / `400` as above.

---

# Notifications

Base path: `/api/notifications/`. Auth: required on every endpoint.

## GET `notifications/`

Lists the caller's own notifications, newest first.

Response `200`:
```json
{
  "count": 1,
  "results": [
    { "id": 1, "verb": "Ali Raza requested to join your ride to LGU Campus.", "content_type": "ridejoinrequest", "object_id": 5, "is_read": false, "created_at": "..." }
  ]
}
```

`content_type` is the lowercase model name of the linked object (`"ride"` or `"ridejoinrequest"`), not a numeric id — safe for the client to branch on.

## POST `notifications/<id>/read/`

Marks one of the caller's own notifications as read. `404` if it isn't the caller's.

Response `200`: the updated notification object.

## One-trip-at-a-time rule

A student with a trip under way cannot offer, request, join or accept another. "Under way" = a started scheduled ride (as driver or accepted passenger), an active Ride Now trip (as rider or driver), or an accepted lift-board request. Blocked actions (`POST rides/`, `POST rides/<id>/join/`, `POST ondemand/rides/`, `POST ondemand/rides/<id>/accept/`, `POST ondemand/peer-requests/`, `POST ondemand/peer-requests/<id>/respond/`) answer `400` with `{"detail": "You have a ride in progress. Finish it before offering or requesting another."}`.

## GET `rides/active/`

Auth: required. Returns `{"trip": null}` when the student is free, otherwise
`{"trip": {"type": "scheduled" | "ondemand" | "peer", "id": 16, "status": "in_progress", "from": "DHA Phase 6", "to": "Gulberg III", "partner_name": "..."}}` (`partner_name` only for `peer`). The Ride Sharing screen polls it every 15 seconds and pins the trip as a banner above the tabs.
