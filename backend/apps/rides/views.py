from django.db import IntegrityError, transaction
from django.db.models import Q, Case, When, Value, IntegerField, Count
from django.shortcuts import get_object_or_404
from django.utils import timezone
from rest_framework import generics, permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView

from accounts.models import StudentRoster
from common.geo import haversine_km
from common.notifications import notify

from .active import active_trip, ensure_free
from .models import Location, Ride, RideJoinRequest, expire_stale_rides
from .serializers import LocationSerializer, RideJoinRequestSerializer, RideSerializer

RIDE_MATCH_RADIUS_KM = 5
LOCATION_SUGGESTION_LIMIT = 15


def _parse_float(value):
    try:
        return float(value)
    except (TypeError, ValueError):
        return None


def _leg_matches(ride_lat, ride_lng, query_lat, query_lng, radius_km, ride_text, query_text):
    # Coordinates given for this leg: proximity match, falling back to text for rides that
    # were never geocoded (never strand an ungeocoded ride that still text-matches).
    if query_lat is not None and query_lng is not None:
        if ride_lat is not None and ride_lng is not None:
            return haversine_km(ride_lat, ride_lng, query_lat, query_lng) <= radius_km
        return (query_text.lower() in ride_text.lower()) if query_text else True
    return (query_text.lower() in ride_text.lower()) if query_text else True


class LocationListView(generics.ListAPIView):
    serializer_class = LocationSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        query = self.request.query_params.get("q", "").strip()
        if not query:
            return Location.objects.all().order_by("name")[:LOCATION_SUGGESTION_LIMIT]
        return Location.objects.filter(name__icontains=query).order_by("name")[:LOCATION_SUGGESTION_LIMIT]


class RideListCreateView(generics.ListCreateAPIView):
    serializer_class = RideSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_serializer_context(self):
        context = super().get_serializer_context()
        user = self.request.user
        if user and user.is_authenticated:
            context["user_join_request_statuses"] = dict(
                RideJoinRequest.objects.filter(requester=user).values_list("ride_id", "status")
            )
            context["pending_request_counts"] = dict(
                RideJoinRequest.objects.filter(ride__offerer=user, status=RideJoinRequest.Status.PENDING)
                .values("ride_id").annotate(total=Count("id")).values_list("ride_id", "total")
            )
        return context

    def get_queryset(self):
        expire_stale_rides()
        user = self.request.user
        params = self.request.query_params
        queryset = Ride.objects.filter(Q(seats_available__gt=0, status=Ride.Status.OPEN) | Q(offerer=user, status__in=[Ride.Status.OPEN, Ride.Status.IN_PROGRESS])).select_related("offerer")

        date = params.get("date")
        if date:
            queryset = queryset.filter(departure_date=date)

        # Same-gender-only rides simply don't surface for a mismatched (or blank-gender) seeker.
        # gender lives on StudentRoster now, not User, so match offerers by email membership.
        matching_gender_emails = StudentRoster.objects.filter(gender__iexact=user.gender).values("email")
        queryset = queryset.filter(Q(same_gender_only=False) | Q(offerer__email__in=matching_gender_emails))
        queryset = queryset.annotate(own_trip_order=Case(When(offerer=user, then=Value(0)), default=Value(1), output_field=IntegerField())).order_by("own_trip_order", "departure_date", "departure_time")

        # Match each word anywhere in the route or driver's roster name.
        for term in params.get("q", "").strip().split():
            drivers = StudentRoster.objects.filter(full_name__icontains=term).values("email")
            queryset = queryset.filter(Q(departure__icontains=term) | Q(destination__icontains=term)
                | Q(offerer__email__in=drivers) | Q(departure_date__icontains=term))

        departure_text = params.get("departure")
        destination_text = params.get("destination")
        departure_lat = _parse_float(params.get("departure_lat"))
        departure_lng = _parse_float(params.get("departure_lng"))
        destination_lat = _parse_float(params.get("destination_lat"))
        destination_lng = _parse_float(params.get("destination_lng"))

        if departure_lat is None and destination_lat is None:
            # No coordinates supplied anywhere — plain SQL substring matching, unchanged.
            if departure_text:
                queryset = queryset.filter(departure__icontains=departure_text)
            if destination_text:
                queryset = queryset.filter(destination__icontains=destination_text)
            return queryset

        # Haversine isn't expressible in plain Postgres without PostGIS, so once coordinates
        # are involved, filter in Python. Fine at this row count (low hundreds of rides).
        radius_km = _parse_float(params.get("radius_km")) or RIDE_MATCH_RADIUS_KM
        return [
            ride for ride in queryset
            if _leg_matches(ride.departure_lat, ride.departure_lng, departure_lat, departure_lng, radius_km, ride.departure, departure_text)
            and _leg_matches(ride.destination_lat, ride.destination_lng, destination_lat, destination_lng, radius_km, ride.destination, destination_text)
        ]

    def perform_create(self, serializer):
        ensure_free(self.request.user)
        serializer.save(offerer=self.request.user)


class ActiveTripView(APIView):
    """The caller's trip under way (any ride feature), pinned at the top of Ride Sharing."""

    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        return Response({"trip": active_trip(request.user)})


class RideHistoryView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        from apps.ondemand.models import OnDemandRide, PeerRideRequest
        # Only show rides the user actually travelled with:
        # 1. As passenger: join request was accepted
        # 2. As offerer: had accepted passenger(s) or ride completed/in-progress
        scheduled = Ride.objects.filter(
            Q(join_requests__requester=request.user, join_requests__status=RideJoinRequest.Status.ACCEPTED) |
            Q(offerer=request.user, join_requests__status=RideJoinRequest.Status.ACCEPTED) |
            Q(offerer=request.user, status__in=[Ride.Status.COMPLETED, Ride.Status.IN_PROGRESS])
        ).distinct().select_related("offerer").prefetch_related("join_requests__requester").order_by("-departure_date", "-departure_time")

        # Peer Realtime rides where user travelled (accepted or completed)
        realtime_peers = PeerRideRequest.objects.filter(
            (Q(poster=request.user) | Q(responder=request.user)) &
            Q(status__in=[PeerRideRequest.Status.ACCEPTED, PeerRideRequest.Status.COMPLETED])
        ).select_related("poster", "responder").order_by("-created_at")

        realtime_list = []
        for ride in realtime_peers:
            is_poster = ride.poster_id == request.user.id
            partner = ride.responder if is_poster else ride.poster
            partner_name = (partner.full_name or partner.email) if partner else "Campus Peer"
            role = "Offered Lift" if ((ride.kind == "offering" and is_poster) or (ride.kind == "need_ride" and not is_poster)) else "Passenger"
            realtime_list.append({
                "id": ride.id,
                "pickup": ride.pickup_label,
                "destination": ride.drop_label,
                "status": ride.status,
                "created_at": ride.created_at,
                "role": role,
                "partner_name": partner_name,
                "departure_time": ride.departure_time,
            })

        # Also include legacy accepted on-demand rides if any
        legacy_realtime = OnDemandRide.objects.filter(
            (Q(rider=request.user) | Q(driver=request.user)) &
            Q(status__in=["accepted", "in_progress", "completed"])
        ).select_related("rider", "driver").order_by("-created_at")
        for ride in legacy_realtime:
            is_driver = ride.driver_id == request.user.id
            partner = ride.rider if is_driver else ride.driver
            partner_name = (partner.full_name or partner.email) if partner else "Campus Driver"
            realtime_list.append({
                "id": ride.id,
                "pickup": ride.pickup_label,
                "destination": ride.drop_label,
                "status": ride.status,
                "created_at": ride.created_at,
                "role": "Driver" if is_driver else "Passenger",
                "partner_name": partner_name,
                "departure_time": "Completed",
            })

        return Response({
            "scheduled": RideSerializer(scheduled, many=True, context={"request": request}).data,
            "realtime": realtime_list,
        })


class RideDetailView(generics.RetrieveAPIView):
    serializer_class = RideSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_serializer_context(self):
        context = super().get_serializer_context()
        user = self.request.user
        if user and user.is_authenticated:
            context["user_join_request_statuses"] = dict(
                RideJoinRequest.objects.filter(requester=user).values_list("ride_id", "status")
            )
            context["pending_request_counts"] = dict(
                RideJoinRequest.objects.filter(ride__offerer=user, status=RideJoinRequest.Status.PENDING)
                .values("ride_id").annotate(total=Count("id")).values_list("ride_id", "total")
            )
        return context

    def get_queryset(self):
        expire_stale_rides()
        return Ride.objects.select_related("offerer")


class MyRidesView(generics.ListAPIView):
    serializer_class = RideSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_serializer_context(self):
        context = super().get_serializer_context()
        user = self.request.user
        if user and user.is_authenticated:
            context["user_join_request_statuses"] = dict(
                RideJoinRequest.objects.filter(requester=user).values_list("ride_id", "status")
            )
            context["pending_request_counts"] = dict(
                RideJoinRequest.objects.filter(ride__offerer=user, status=RideJoinRequest.Status.PENDING)
                .values("ride_id").annotate(total=Count("id")).values_list("ride_id", "total")
            )
        return context

    def get_queryset(self):
        # Every ride the caller has offered, any status — unlike the public list, this
        # includes full and cancelled rides so the offerer can track their own history.
        expire_stale_rides()
        return Ride.objects.filter(offerer=self.request.user).select_related("offerer").order_by("-created_at")


class RideCancelView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, pk):
        ride = get_object_or_404(Ride.objects.select_related("offerer"), pk=pk)
        if ride.offerer != request.user:
            return Response({"detail": "Only the offerer can cancel this ride."}, status=status.HTTP_403_FORBIDDEN)
        if ride.status != Ride.Status.OPEN:
            return Response({"detail": "Only an open ride can be cancelled."}, status=status.HTTP_400_BAD_REQUEST)
        if ride.join_requests.filter(status=RideJoinRequest.Status.ACCEPTED).exists():
            return Response(
                {"detail": "Can't cancel a ride that already has an accepted rider."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        ride.status = Ride.Status.CANCELLED
        ride.save(update_fields=["status"])

        for pending in ride.join_requests.filter(status=RideJoinRequest.Status.PENDING).select_related("requester"):
            notify(pending.requester, f"The ride to {ride.destination} you requested was cancelled.", target=ride)

        return Response(RideSerializer(ride, context={"request": request}).data)


class RideStartView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, pk):
        ride = get_object_or_404(Ride.objects.select_related("offerer"), pk=pk)
        if ride.offerer != request.user:
            return Response({"detail": "Only the offerer can start this ride."}, status=status.HTTP_403_FORBIDDEN)
        if ride.status != Ride.Status.OPEN:
            return Response({"detail": "Only an open ride can be started."}, status=status.HTTP_400_BAD_REQUEST)

        ride.status = Ride.Status.IN_PROGRESS
        ride.started_at = timezone.now()
        ride.save(update_fields=["status", "started_at"])

        for accepted in ride.join_requests.filter(status=RideJoinRequest.Status.ACCEPTED).select_related("requester"):
            notify(accepted.requester, f"Your ride to {ride.destination} has started.", target=ride)

        return Response(RideSerializer(ride, context={"request": request}).data)


class RideCompleteView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, pk):
        ride = get_object_or_404(Ride.objects.select_related("offerer"), pk=pk)
        if ride.offerer != request.user:
            return Response({"detail": "Only the offerer can complete this ride."}, status=status.HTTP_403_FORBIDDEN)
        if ride.status != Ride.Status.IN_PROGRESS:
            return Response({"detail": "Only a ride in progress can be completed."}, status=status.HTTP_400_BAD_REQUEST)

        ride.status = Ride.Status.COMPLETED
        ride.completed_at = timezone.now()
        ride.save(update_fields=["status", "completed_at"])

        return Response(RideSerializer(ride, context={"request": request}).data)


class RideJoinView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, pk):
        ride = get_object_or_404(Ride.objects.select_related("offerer"), pk=pk)
        requester = request.user
        ensure_free(requester)

        if ride.offerer == requester:
            return Response({"detail": "You can't request to join your own ride."}, status=status.HTTP_400_BAD_REQUEST)
        if ride.status != Ride.Status.OPEN:
            return Response({"detail": "This ride is no longer open to join."}, status=status.HTTP_400_BAD_REQUEST)
        if ride.seats_available <= 0:
            return Response({"detail": "This ride is full."}, status=status.HTTP_400_BAD_REQUEST)
        if ride.same_gender_only and requester.gender != ride.offerer.gender:
            return Response(
                {"detail": "This ride is only open to riders of the same gender."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            join_request = RideJoinRequest.objects.create(ride=ride, requester=requester)
        except IntegrityError:
            return Response({"detail": "You've already requested to join this ride."}, status=status.HTTP_400_BAD_REQUEST)

        notify(ride.offerer, f"{requester.full_name} requested to join your ride to {ride.destination}.", target=join_request)
        return Response(RideJoinRequestSerializer(join_request).data, status=status.HTTP_201_CREATED)


class RideJoinRequestListView(generics.ListAPIView):
    serializer_class = RideJoinRequestSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        ride = get_object_or_404(Ride, pk=self.kwargs["pk"])
        return ride.join_requests.select_related("requester", "ride").order_by("-created_at")

    def list(self, request, *args, **kwargs):
        ride = get_object_or_404(Ride, pk=self.kwargs["pk"])
        if ride.offerer != request.user:
            return Response({"detail": "Only the offerer can view join requests."}, status=status.HTTP_403_FORBIDDEN)
        return super().list(request, *args, **kwargs)


class RideJoinRequestAcceptView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, pk):
        join_request = get_object_or_404(
            RideJoinRequest.objects.select_related("ride", "ride__offerer", "requester"),
            pk=pk,
        )
        if join_request.ride.offerer != request.user:
            return Response({"detail": "Only the offerer can accept join requests."}, status=status.HTTP_403_FORBIDDEN)

        with transaction.atomic():
            ride = Ride.objects.select_for_update().get(pk=join_request.ride_id)
            locked_request = RideJoinRequest.objects.select_for_update().get(pk=join_request.pk)

            if locked_request.status != RideJoinRequest.Status.PENDING:
                return Response({"detail": "This request has already been handled."}, status=status.HTTP_400_BAD_REQUEST)
            if ride.status != Ride.Status.OPEN:
                return Response({"detail": "This ride is no longer open."}, status=status.HTTP_400_BAD_REQUEST)
            if ride.seats_available <= 0:
                return Response({"detail": "This ride is full."}, status=status.HTTP_400_BAD_REQUEST)

            locked_request.status = RideJoinRequest.Status.ACCEPTED
            locked_request.save(update_fields=["status"])
            ride.seats_available -= 1
            ride.save(update_fields=["seats_available"])

        notify(locked_request.requester, f"Your request to join the ride to {ride.destination} was accepted.", target=locked_request)

        return Response({
            "ride": RideSerializer(ride, context={"request": request}).data,
            "join_request": RideJoinRequestSerializer(locked_request).data,
        })


class RideJoinRequestDeclineView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, pk):
        join_request = get_object_or_404(
            RideJoinRequest.objects.select_related("ride", "ride__offerer", "requester"),
            pk=pk,
        )
        if join_request.ride.offerer != request.user:
            return Response({"detail": "Only the offerer can decline join requests."}, status=status.HTTP_403_FORBIDDEN)
        if join_request.status != RideJoinRequest.Status.PENDING:
            return Response({"detail": "This request has already been handled."}, status=status.HTTP_400_BAD_REQUEST)

        join_request.status = RideJoinRequest.Status.DECLINED
        join_request.save(update_fields=["status"])

        notify(join_request.requester, f"Your request to join the ride to {join_request.ride.destination} was declined.", target=join_request)

        return Response(RideJoinRequestSerializer(join_request).data)
