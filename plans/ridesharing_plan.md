# Ride Sharing module — implementation plan

## Context

Salman owns Ride Sharing (per `CLAUDE.md`'s module split) and it's next in the documented build order (`system_design.md` §10: User Profiles done → High-priority tier next). This plan covers SRS §4.1 (REQ RS 01–05): post a ride offer, text-based route matching for seekers, join requests, offerer accept/decline, and both parties seeing each other's contact info once confirmed.

One scheduling gap in `system_design.md` surfaced during planning: `common.notifications.notify()` was earmarked for whenever Resource Sharing (Zahra's module) gets built, but REQ RS 03 needs in-app notifications now. Confirmed with the user: build a minimal DB-backed `Notification` model + `notify()` helper in `common/` as part of this module (no FCM/push — matches the project's existing pattern of deferring real infra, same as the console email backend and local-disk uploads). Zahra's future module reuses it instead of rebuilding it.

This is also the **first app under `backend/apps/`** — `accounts`/`common` are currently flat top-level packages; `system_design.md` §4 documents `apps/rides/`, `apps/resources/`, etc. as the intended home for every feature app going forward, so this plan sets that precedent correctly (nested package, `AppConfig.name`/`label`) for every module after it.

Scope is deliberately tight to REQ RS 01–05: no GPS/polyline matching (named scope cut in `system_design.md` §9 — text route + time window only), no ride cancellation flow, no phone/contact model (email + name already suffice as "contact info in-app"), no push notifications.

**Known gap, confirmed with user:** text-substring route matching is a placeholder, not a final answer — revisit with something smarter (fuzzy match or waypoint overlap) before final submission if time allows. Ship as-is for now.

**Gender-preference addition, confirmed with user:** some riders (particularly female students) may not be comfortable sharing a car with the opposite gender, so an offerer can mark a ride "same gender only." Gender is sourced from the official roster dataset (not self-reported at signup — the dummy student dataset the user is attaching already carries gender info), male/female only, no third case to define matching rules for.

## Backend

### 0. Prerequisite — `accounts`: roster becomes the full "university API" record

Bigger addition to the already-built Auth module (Salman's own, so in scope here), confirmed with user: the roster CSV is standing in for a real university API feed, so it should carry the full official student record — not just an email whitelist. Registration then just proves *identity* (email you can receive mail at + a password you choose); the university-sourced facts about who you are come from the roster, not free-text typing, which also closes the "type a fake name" gap.

- `backend/accounts/models.py`:
  - `StudentRoster` gets `full_name` (`CharField`), `department` (`CharField`), `enrollment_year` (`PositiveIntegerField`, null=True), `gender` (`CharField`, `choices=[("male", "Male"), ("female", "Female")]`, blank=True) — all populated from the CSV; blank/null tolerated per-field so a sparse dataset row doesn't hard-fail the whole import.
  - `User.gender` (same choices, blank=True) added — copied from the matching roster row at registration.
- `backend/accounts/management/commands/import_roster.py` — reader now looks for `full_name`, `department`, `enrollment_year`, `gender` columns too (same case-insensitive header matching as the existing `email` lookup, each optional independently); `gender` values normalized (`M`/`Male`/`male` → `male`, same for female), `enrollment_year` parsed as int with invalid/blank left null. Existing `email`-only CSVs still work unchanged — new columns are opt-in, not required.
- `backend/accounts/serializers.py`:
  - `RegisterSerializer.Meta.fields` shrinks to `["email", "password"]` — `full_name`/`department`/`enrollment_year`/`gender` are no longer user-submitted.
  - `validate_email()` changes `.filter(email=email).exists()` → `.filter(email=email).first()`, stores the row on `self._roster`, same not-found error if `None`.
  - `create()` merges the roster fields in: `User.objects.create_user(**validated_data, full_name=self._roster.full_name, department=self._roster.department, enrollment_year=self._roster.enrollment_year, gender=self._roster.gender)`.
  - `UserSerializer` adds `"gender"` to `fields`/`read_only_fields` (already had the other three, now also read-only in spirit since they trace back to the roster — `PATCH /auth/me/` keeps letting a student self-correct `department`/`enrollment_year` after the fact, matching the existing product behavior, but `gender` is not patchable, added to `read_only_fields`).
- `mobile/src/features/auth/presentation/RegisterScreen.tsx` — drops the "Full name" `TextInput`; form becomes just email + password. `authApi.ts`'s `RegisterPayload` shrinks to `{ email, password }`.
- `docs/api-contracts/auth.md` — `register/` request example shrinks to `{ email, password }`; note added that `full_name`/`department`/`enrollment_year`/`gender` come from the roster, not the request body.
- No migration data loss: every new roster/user field is nullable/blank-tolerant, so this is purely additive.

#### Dummy dataset (simulated university API)

- `backend/accounts/fixtures/dummy_students.csv` — ~30 rows, columns `email,full_name,department,enrollment_year,gender`. Plausible Pakistani student names, `@lgu.edu.pk` emails, mixed departments (CS/SE/EE/BBA), enrollment years 2021–2025, roughly balanced `male`/`female` split (so the same-gender-only ride path has real data to exercise both ways in manual testing).
- Loaded via the existing command: `python manage.py import_roster backend/accounts/fixtures/dummy_students.csv` — no new tooling, `import_roster.py`'s extended column support (above) is all this needs.

### 1. New app: `backend/apps/rides/`

- `backend/apps/__init__.py` — new, makes `apps` a package.
- `backend/apps/rides/apps.py`:
  ```python
  class RidesConfig(AppConfig):
      name = "apps.rides"
      label = "rides"
  ```
- `backend/apps/rides/models.py`:
  - `Ride`: `offerer` FK → `settings.AUTH_USER_MODEL` (`related_name="ride_offers"`), `departure`/`destination` (`CharField`), `departure_date` (`DateField`), `departure_time` (`TimeField`), `seats_total`/`seats_available` (`PositiveSmallIntegerField`, `validators=[MinValueValidator(1), MaxValueValidator(8)]` on `seats_total` — one car's worth of seats, confirmed with user), `same_gender_only` (`BooleanField`, default False — confirmed with user, offerer-side toggle), `is_cancelled` (`BooleanField`, default False), `created_at` (`auto_now_add`).
  - `RideJoinRequest`: `ride` FK (`related_name="join_requests"`), `requester` FK → User (`related_name="ride_join_requests"`), `status` (`TextChoices`: pending/accepted/declined, default pending), `created_at`. `Meta.constraints = [UniqueConstraint(fields=["ride", "requester"], name="unique_ride_requester")]` — one request per person per ride, DB-enforced.
  - Follow `accounts/models.py` conventions exactly: no unnecessary `Meta`, `related_name` on every FK, short inline comments only where non-obvious.
- `backend/apps/rides/serializers.py`:
  - `RideUserSerializer(ModelSerializer)` — `id, email, full_name` only (lighter than `accounts.UserSerializer`; imports `accounts.models.User`, which is always allowed).
  - `RideSerializer(ModelSerializer)` — nests `offerer = RideUserSerializer(read_only=True)`; `create()` sets `seats_available = seats_total` (mirrors `RegisterSerializer.create()`'s override pattern); `my_request_status = SerializerMethodField()` reading `self.context["request"].user`'s join request on this ride (null/pending/accepted/declined); `validate_departure_date()` rejects dates before `timezone.localdate()` — confirmed with user, no past-dated listings; `validate_same_gender_only()` — if `True` and `self.context["request"].user.gender` is blank, reject ("Set your gender in your profile roster record before restricting a ride.") since the offerer's own blank gender would make the toggle meaningless.
  - `RideJoinRequestSerializer(ModelSerializer)` — nests `requester = RideUserSerializer(read_only=True)`.
- `backend/apps/rides/views.py` (`permission_classes = [permissions.IsAuthenticated]` on every view — no default in settings):
  - `RideListCreateView(generics.ListCreateAPIView)` — `perform_create` sets `offerer=self.request.user`. `get_queryset()`: base `Ride.objects.filter(seats_available__gt=0, is_cancelled=False).select_related("offerer")`, optional `?departure=`/`?destination=` via `icontains`, optional `?date=` exact match, `order_by("departure_date", "departure_time")`, then `.filter(Q(same_gender_only=False) | Q(offerer__gender=self.request.user.gender))` — same-gender-only rides simply don't show up in a mismatched (or blank-gender) seeker's search results, no separate opt-in filter needed. This *is* REQ RS 02's "match by route overlap" — text substring + chronological order, no geo/proximity-scoring algorithm (named scope cut).
  - `RideDetailView(generics.RetrieveAPIView)`.
  - `RideCancelView(APIView)` — POST only, offerer-only (403 otherwise), 400 if already cancelled or already has an accepted request (can't cancel on someone who already got in — keeps REQ RS 05's confirmed-contact guarantee intact); sets `is_cancelled=True`; notifies any requesters with `status=PENDING` that the ride was cancelled. Confirmed with user as the one addition beyond the original no-edit/no-cancel scope cut.
  - `RideJoinView(APIView)` — POST only, no body. Rejects `offerer == request.user` ("You can't request to join your own ride."), `seats_available <= 0` ("This ride is full."), and — confirmed with user — `ride.same_gender_only and requester.gender != ride.offerer.gender` ("This ride is only open to riders of the same gender.", covers a blank requester gender too since `"" != "male"/"female"`) before creating; catches the unique-constraint case (already requested) and returns a friendly 400, not a raw `IntegrityError`. Calls `notify(ride.offerer, f"{requester.full_name} requested to join your ride to {ride.destination}.", target=join_request)` — satisfies REQ RS 03.
  - `RideJoinRequestListView(generics.ListAPIView)` — 403 unless `request.user == ride.offerer`.
  - `RideJoinRequestAcceptView(APIView)` — offerer-only. Root-cause fix for the double-accept race on the last seat: wrap in `transaction.atomic()`, `select_for_update()` both the `Ride` and `RideJoinRequest` rows, re-check `status == PENDING` and `seats_available > 0` inside the lock, then set `status=ACCEPTED` and decrement `seats_available`. Calls `notify()` on the accepted requester. Response nests both `ride` and `join_request` (with `requester` contact fields) — satisfies REQ RS 05.
  - `RideJoinRequestDeclineView(APIView)` — offerer-only, sets `status=DECLINED`, calls `notify()` on the requester.
  - `permission_classes` explicit everywhere; error envelope `{"detail": "..."}` matching `accounts/views.py`.
- `backend/apps/rides/urls.py` — flat `path()` list, trailing slashes, `name="rides-*"`:
  ```
  ""                          RideListCreateView        rides-list
  "<int:pk>/"                 RideDetailView             rides-detail
  "<int:pk>/join/"            RideJoinView               rides-join
  "<int:pk>/cancel/"          RideCancelView             rides-cancel
  "<int:pk>/requests/"        RideJoinRequestListView    rides-requests
  "requests/<int:pk>/accept/" RideJoinRequestAcceptView  rides-request-accept
  "requests/<int:pk>/decline/" RideJoinRequestDeclineView rides-request-decline
  ```
- `backend/apps/rides/admin.py` — `@admin.register` style mirroring `accounts/admin.py`, `list_display`/`list_filter`/`search_fields` for `Ride` and `RideJoinRequest`.

### 2. `common/` — Notification (new, shared foundation)

- `backend/common/models.py` — `Notification`: `recipient` FK → User (`related_name="notifications"`), `verb` (`CharField`, pre-rendered human sentence — no enum/template layer), `content_type`/`object_id` + `GenericForeignKey("content_type", "object_id")` (uses `django.contrib.contenttypes`, already installed — less code than hand-rolled string target fields), `is_read` (default False), `created_at`.
- `backend/common/notifications.py` — `notify(recipient, verb, target=None)` → `Notification.objects.create(...)`. One function, called directly from `apps/rides/views.py` (no signals/event bus — YAGNI for one caller).
- `backend/common/serializers.py` (new) — `NotificationSerializer`: `id, verb, is_read, created_at`, `content_type` as `SlugRelatedField(slug_field="model", read_only=True)` (mobile sees `"ride"`/`"ridejoinrequest"`, not a numeric PK).
- `backend/common/views.py` — `NotificationListView(generics.ListAPIView)` (own notifications, `-created_at`), `MarkNotificationReadView(APIView)` (`get_object_or_404(..., recipient=request.user)`, sets `is_read=True`).
- `backend/common/urls.py` (new) — `""` → list (`notifications-list`), `"<int:pk>/read/"` → mark-read (`notifications-mark-read`).
- `backend/common/admin.py` — register `Notification`.

### 3. Wiring

- `backend/config/settings/base.py`, `INSTALLED_APPS`: add `"apps.rides"` after `"common"`.
- `backend/config/urls.py`: add
  ```python
  path("api/rides/", include("apps.rides.urls")),
  path("api/notifications/", include("common.urls")),
  ```
- Migrations from `backend/`: `python manage.py makemigrations accounts rides common` then `python manage.py migrate` (this is `common`'s first real migration — its `migrations/__init__.py` scaffold already exists; `accounts` gets a small additive migration for the two `gender` fields).

### 4. Contract doc

- `docs/api-contracts/rides.md` — written before/alongside the code, mirroring `docs/api-contracts/auth.md`'s structure (endpoints, method, path, auth, request/response JSON, pagination/filter params), per `system_design.md` §5's contract-first workflow. Include the `/api/notifications/` endpoints too since they're new here.

## Mobile — `mobile/src/features/rides/`

Notifications UI folds into this feature (its only consumer today) rather than a separate `features/notifications/` — split out later if a second module needs it.

```
src/features/rides/
  data/ridesApi.ts          # createRide, listRides, getRide, joinRide, listRideRequests, acceptRequest, declineRequest
  data/notificationsApi.ts  # listNotifications, markNotificationRead
  presentation/RideListScreen.tsx       # search form + results + links to Offer/Notifications
  presentation/OfferRideScreen.tsx      # create form
  presentation/RideDetailScreen.tsx     # join button, or (if offerer) requests list + accept/decline
  presentation/NotificationsScreen.tsx  # list, tap to mark read
  rides.ts                              # barrel — exports the two *Api.ts modules' functions only
```

- `ridesApi.ts`/`notificationsApi.ts`: plain exported async functions on the shared `apiClient`, typed via local `interface`s, no try/catch (mirrors `authApi.ts` exactly) — reuse `apiClient` and `useSessionStore` unchanged.
- `mobile/src/core/auth/session.ts` — `AuthedUser` gets `gender: "male" | "female" | ""` (one added field, read-only from the backend, matches the roster-sourced/non-editable design).
- `OfferRideScreen.tsx` — a native `Switch` (from `react-native`, already a dependency, no new package) labeled "Same gender only", posts `same_gender_only` with the create payload. If `user.gender` is blank, the switch is disabled with a one-line hint ("Set your gender via your roster record to use this.") rather than silently failing server-side.
- `RideListScreen.tsx`/`RideDetailScreen.tsx` — a small "Same gender only" text badge on cards/detail when `ride.same_gender_only` is true, reusing the existing badge/meta text style already in `ProfileScreen.tsx` (`styles.meta`) rather than inventing a new component.
- Screens: default-export function components, `useState` per field + `error`/`isSubmitting`, try/catch/finally reading `err?.response?.data?.detail`, `StyleSheet.create` reusing the existing hardcoded palette (`#1d4ed8`, `#dc2626`, `#ccc`, `#666`) — same shape as `VerifyEmailScreen.tsx`/`ProfileScreen.tsx`.
- Date/time input: plain `TextInput` with placeholder hints (`YYYY-MM-DD`, `HH:MM`) + a light regex check before submit. No date-picker library exists in `package.json` and none is added for this — flagged corner: no native picker UX, add `@react-native-community/datetimepicker` later if manual typing proves error-prone in the demo.
- `RideDetailScreen.tsx`: reads `id` via `useLocalSearchParams` (same pattern as `VerifyEmailScreen`'s `email` param). If `ride.offerer.id === user.id`, fetch and render `listRideRequests` with Accept/Decline; otherwise render a Join button gated on `my_request_status`.
- `NotificationsScreen.tsx`: refetch on focus via `useFocusEffect` (already available transitively through `expo-router`/`@react-navigation`, no new package). No unread badge/polling — there's no nav shell to put a badge on yet.
- Routes (`mobile/app/(app)/rides/`), one-line re-exports like the existing ones:
  ```
  index.tsx          -> RideListScreen
  offer.tsx           -> OfferRideScreen
  [id].tsx            -> RideDetailScreen
  notifications.tsx   -> NotificationsScreen
  ```
- `ProfileScreen.tsx` gets one added line (a `Pressable`/`Link` to `/rides`) since there's no tab bar/nav shell yet — the only necessary touch to an existing file.

## Verification

No new HTML test console (the auth one existed because typing OTP codes by hand was painful; ride sharing has no such friction, and `/api/docs/` Swagger UI already gives a clickable form for every new endpoint for free).

Manual end-to-end pass via curl/Swagger with two already-verified accounts (offerer, seeker):
1. Offer → 201, `seats_available == seats_total`.
2. Search unauthenticated → 401; authenticated with matching `departure`/`destination` → ride appears, ordered by date/time; non-matching substring → empty.
3. Join as seeker → 201; retry → 400 friendly dupe message; offerer joining own ride → 400.
4. `GET /api/notifications/` as offerer → unread entry with seeker's name; mark-read → reflected on next list.
5. `GET /api/rides/<id>/requests/` as offerer → seeker `pending`; same as seeker → 403.
6. Accept → 200, both `offerer`/`requester` contact fields present; seeker's `GET /api/rides/<id>/` shows `my_request_status: "accepted"` and offerer's contact (REQ RS 05 both sides); seeker's notifications show the acceptance.
7. Decline path on a second ride → `status: declined`, seeker notified, seats unchanged.
8. Seats-exhausted: `seats_total=1`, two seekers join, offerer accepts one → `seats_available: 0`; accepting the second → 400 "full"; a third join attempt → 400 "full"; ride drops out of search results.
9. Cancel: offerer cancels a ride with only pending requests → 200, requesters notified, ride drops out of search; cancelling a ride with an accepted request → 400; cancelling as non-offerer → 403.
10. Gender preference: female offerer posts `same_gender_only=True` → male seeker's search doesn't list it, join attempt (via direct ID) → 400; female seeker's search lists it, join → 201. Roster import with a `gender` column populates `StudentRoster.gender`; a registered user's `/auth/me/` reflects it; a blank-gender user can't toggle `same_gender_only` when offering and doesn't see restricted rides in search.
11. Mobile: same flow through `OfferRideScreen` → `RideListScreen` → `RideDetailScreen` (join, switch account, accept/decline, cancel) → `NotificationsScreen` against the live `runserver` + Expo dev client.

## Project housekeeping (per CLAUDE.md)

After implementation and verification:
- Log the work as a `history.txt` journal entry (salman, timestamp, compact plain-English summary).
- Document the module's working in `documentation.txt`.
- Attempt to sync notes to `D:\Code Creations\Projects\obsidian-vault\FYP-app` — if the folder doesn't exist, skip and tell the user.

## Critical files
- `backend/accounts/models.py`, `serializers.py`, `management/commands/import_roster.py` (gender field)
- `backend/apps/rides/models.py`, `views.py`, `serializers.py`, `urls.py`
- `backend/common/models.py`, `notifications.py`, `views.py`, `urls.py`
- `backend/config/settings/base.py`, `backend/config/urls.py`
- `docs/api-contracts/rides.md` (and a note on the `gender`/`same_gender_only` fields in `docs/api-contracts/auth.md`)
- `mobile/src/core/auth/session.ts` (`AuthedUser.gender`)
- `mobile/src/features/rides/data/ridesApi.ts`
- `mobile/src/features/rides/presentation/RideDetailScreen.tsx`, `OfferRideScreen.tsx`
- `mobile/app/(app)/profile.tsx` (one-line nav link addition)
