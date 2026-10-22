"""Moderation for the library, print center, and shared rides."""
from django.db import transaction
from django.db.models import Q
from django.shortcuts import get_object_or_404
from rest_framework.exceptions import ValidationError
from rest_framework.pagination import PageNumberPagination
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.library.models import LibraryProject, Note
from apps.printing.models import PrinterProfile, PrintRating, PrintRequest
from apps.rides.models import Ride, RideJoinRequest
from apps.ondemand.models import OnDemandRide, RideProfile
from common.notifications import notify
from .admin_views import IsPlatformAdmin


# Explicit allowlist: never resolve a model or writable field from client input.
KINDS = {
    "library": {"projects": (LibraryProject, "author", "title"), "notes": (Note, "author", "title")},
    "printing": {"requests": (PrintRequest, "requester", None), "printers": (PrinterProfile, "user", None),
                 "ratings": (PrintRating, "rater", "comment")},
    "rides": {"rides": (Ride, "offerer", "departure"), "requests": (RideJoinRequest, "requester", None),
              "on_demand": (OnDemandRide, "rider", "pickup_label"), "profiles": (RideProfile, "user", "plate_number")},
}


def actions_for(item):
    if isinstance(item, OnDemandRide):
        return ["cancel"] if item.status in OnDemandRide.ACTIVE_STATUSES else ["delete"]
    if isinstance(item, RideProfile):
        return (["revoke"] if item.is_approved else ["approve"]) + ["delete"] if item.role == "driver" else ["delete"]
    if isinstance(item, LibraryProject):
        return [s for s in LibraryProject.Status.values if s != item.status] + ["delete"]
    if isinstance(item, PrintRequest):
        return ["cancel"] if item.status in ("open", "accepted") else ["delete"]
    if isinstance(item, Ride):
        return ["cancel"] if item.status in ("open", "in_progress") else ["delete"]
    if isinstance(item, RideJoinRequest):
        return ["decline"] if item.status in ("pending", "accepted") and item.ride.status == "open" else []
    return ["delete"]


def serialize_item(item, owner_field):
    owner = getattr(item, owner_field)
    title = getattr(item, "title", None)
    details = getattr(item, "description", "") or getattr(item, "abstract", "")
    state = getattr(item, "status", "")
    if isinstance(item, RideProfile):
        title = f"{item.get_role_display()}: {owner.email}"
        state = "approved" if item.is_approved else "pending" if item.role == "driver" else "rider"
        details = f"{item.vehicle_make} {item.vehicle_model} · {item.plate_number}"
    elif isinstance(item, OnDemandRide):
        title = f"{item.pickup_label} → {item.drop_label}"
        details = f"Rs {item.fare} · {item.distance_km} km · Driver: {item.driver.email if item.driver else 'Unassigned'}"
    elif isinstance(item, PrintRequest):
        title = f"Print request #{item.pk}"
        details = f"{item.copies} copies · {'Color' if item.is_color else 'Black & white'}"
        if item.printer:
            details += f" · Printer: {item.printer.email}"
        elif item.target_printer:
            details += f" · Sent to: {item.target_printer.email}"
        details += f" · Pages: {item.page_range or 'All'}"
    elif isinstance(item, PrinterProfile):
        title = f"Printer: {owner.email}"
        details = f"{item.location_note} · Color: {item.supports_color} · Double-sided: {item.supports_double_sided}"
    elif isinstance(item, PrintRating):
        title = f"{item.score}/5 · Print #{item.request_id}"
        details = f"Printer: {item.printer.email} · {item.comment}"
    elif isinstance(item, Ride):
        title = f"{item.departure} → {item.destination}"
        details = f"{item.departure_date} {item.departure_time} · {item.seats_available}/{item.seats_total} seats available"
    elif isinstance(item, RideJoinRequest):
        title = f"{item.ride.departure} → {item.ride.destination}"
        details = f"Join request · Driver: {item.ride.offerer.email}"
    return {"id": item.pk, "title": title, "description": details, "status": state,
            "owner_email": owner.email, "created_at": item.created_at, "actions": actions_for(item)}


class AdminModuleView(APIView):
    permission_classes = [IsPlatformAdmin]

    def config(self, request, module):
        kinds = KINDS.get(module)
        if not kinds:
            raise ValidationError({"detail": "Unknown module."})
        kind = request.query_params.get("kind", next(iter(kinds)))
        if kind not in kinds:
            raise ValidationError({"detail": "Unknown record type."})
        return kinds[kind]

    def get(self, request, module):
        model, owner, title_field = self.config(request, module)
        qs = model.objects.select_related(owner).order_by("-created_at", "-pk")
        if model == RideJoinRequest:
            qs = qs.select_related("ride__offerer")
        if model == PrintRequest:
            qs = qs.select_related("printer", "target_printer")
        if model == PrintRating:
            qs = qs.select_related("printer")
        if model == OnDemandRide:
            qs = qs.select_related("driver")
        query = request.query_params.get("search", "").strip()
        if query:
            filters = Q(**{f"{owner}__email__icontains": query})
            if title_field:
                filters |= Q(**{f"{title_field}__icontains": query})
            if model == Ride:
                filters |= Q(destination__icontains=query)
            if model == RideJoinRequest:
                filters |= Q(ride__departure__icontains=query) | Q(ride__destination__icontains=query)
            if model == OnDemandRide:
                filters |= Q(drop_label__icontains=query)
            if query.isdigit():
                filters |= Q(pk=int(query))
            qs = qs.filter(filters)
        paginator = PageNumberPagination()
        paginator.page_size = 30
        page = paginator.paginate_queryset(qs, request)
        return paginator.get_paginated_response([serialize_item(item, owner) for item in page])

    @transaction.atomic
    def patch(self, request, module):
        model, owner, _ = self.config(request, module)
        item_id = request.data.get("id")
        if not isinstance(item_id, int) or isinstance(item_id, bool) or item_id < 1:
            raise ValidationError({"detail": "A valid record ID is required."})
        # Join acceptance locks the ride before its join request; keep the same order.
        if model == RideJoinRequest:
            candidate = get_object_or_404(model, pk=item_id)
            Ride.objects.select_for_update().get(pk=candidate.ride_id)
        item = get_object_or_404(model.objects.select_for_update(), pk=item_id)
        action = request.data.get("action")
        if action not in actions_for(item):
            raise ValidationError({"detail": "This action is not available for the current record state."})
        if isinstance(item, RideProfile) and action in ("delete", "revoke") and OnDemandRide.objects.filter(
            Q(driver=item.user) | Q(rider=item.user), status__in=OnDemandRide.ACTIVE_STATUSES
        ).exists():
            raise ValidationError({"detail": "Cancel this user's active on-demand rides before changing their profile."})
        if action == "delete":
            if isinstance(item, PrinterProfile) and PrintRequest.objects.filter(
                Q(printer=item.user) | Q(target_printer=item.user), status__in=["open", "accepted"]
            ).exists():
                raise ValidationError({"detail": "Cancel or release this printer's active requests before removing the profile."})
            item.delete()
            return Response({"message": "Record deleted."})
        if isinstance(item, RideProfile):
            item.is_approved = action == "approve"
            if not item.is_approved:
                item.is_online = False
            item.save(update_fields=["is_approved", "is_online"])
            notify(item.user, f"Your on-demand driver approval was {'granted' if item.is_approved else 'revoked'} by an administrator.", target=item)
        elif isinstance(item, LibraryProject):
            item.status = action
            item.save(update_fields=["status"])
            notify(item.author, f'Your library project "{item.title}" was marked {action} by an administrator.', target=item)
        elif isinstance(item, (PrintRequest, Ride, OnDemandRide)):
            item.status = "cancelled"
            if isinstance(item, OnDemandRide):
                item.cancelled_by = "admin"
                item.save(update_fields=["status", "cancelled_by"])
            else:
                item.save(update_fields=["status"])
            recipients = {getattr(item, owner).pk: getattr(item, owner)}
            if isinstance(item, Ride):
                for join in item.join_requests.select_related("requester").filter(status__in=["pending", "accepted"]):
                    recipients[join.requester_id] = join.requester
            elif isinstance(item, PrintRequest):
                for person in (item.printer, item.target_printer):
                    if person:
                        recipients[person.pk] = person
            elif item.driver:
                recipients[item.driver_id] = item.driver
            for person in recipients.values():
                notify(person, f'{"Print request" if isinstance(item, PrintRequest) else "Ride"} #{item.pk} was cancelled by an administrator.', target=item)
        elif isinstance(item, RideJoinRequest):
            if item.status == "accepted":
                ride = item.ride
                ride.seats_available = min(ride.seats_total, ride.seats_available + 1)
                ride.save(update_fields=["seats_available"])
            item.status = "declined"
            item.save(update_fields=["status"])
            notify(item.requester, f"Your join request for ride #{item.ride_id} was declined by an administrator.", target=item)
        return Response({"message": "Record updated."})
