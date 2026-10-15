import datetime

from django.db import transaction
from django.shortcuts import get_object_or_404
from django.utils import timezone
from rest_framework import generics, permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView

from common.geo import haversine_km
from common.notifications import notify

from .fare import route_between
from .models import OnDemandRide, Place, RideProfile, get_rate_per_km, reset_to_rider
from .serializers import (
    DriverApplicationSerializer,
    DriverStatusSerializer,
    FareQuoteSerializer,
    OnDemandRideSerializer,
    PlaceSerializer,
    RideProfileSerializer,
    RideRequestSerializer,
)

NEARBY_RADIUS_KM = 5
# A request nobody accepts within this long becomes "no driver found".
NO_DRIVER_AFTER_SECONDS = 120

Status = OnDemandRide.Status


def _ensure_profile(user):
    """Everyone starts as a rider - the profile is created the first time it is needed."""
    return RideProfile.objects.get_or_create(user=user, defaults={"role": RideProfile.Role.RIDER})[0]


class MyRideProfileView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        return Response(RideProfileSerializer(_ensure_profile(request.user)).data)


class DriverApplyView(APIView):
    """A rider sends their vehicle details to the admin. They stay unable to drive until it is approved."""

    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        profile = _ensure_profile(request.user)
        if profile.role == RideProfile.Role.DRIVER and profile.is_approved:
            return _error("You are already an approved driver.")
        serializer = DriverApplicationSerializer(profile, data=request.data)
        serializer.is_valid(raise_exception=True)
        # A pending application is a driver row that is not approved yet; the admin approves or rejects it.
        serializer.save(role=RideProfile.Role.DRIVER, is_approved=False)
        return Response(RideProfileSerializer(profile).data)


class DriverStopView(APIView):
    """Withdraw a pending application, or stop being a driver. Back to a plain rider; vehicle details are cleared."""

    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        profile = _ensure_profile(request.user)
        if profile.role != RideProfile.Role.DRIVER:
            return _error("You are not a driver.")
        if OnDemandRide.objects.filter(driver=request.user, status__in=OnDemandRide.ACTIVE_STATUSES).exists():
            return _error("Finish or cancel your current ride first.")
        reset_to_rider(profile)
        return Response(RideProfileSerializer(profile).data)


class PlaceListView(generics.ListAPIView):
    serializer_class = PlaceSerializer
    permission_classes = [permissions.IsAuthenticated]
    queryset = Place.objects.all()
    pagination_class = None  # a short fixed list, the app shows all of it


class FareQuoteView(APIView):
    """Distance x rate per km. Nothing is saved - the rider just sees the amount first."""

    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        serializer = FareQuoteSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data
        distance_km, path, source = route_between(data["pickup_lat"], data["pickup_lng"], data["drop_lat"], data["drop_lng"])
        rate = get_rate_per_km()
        return Response({
            "distance_km": round(distance_km, 1),
            "rate_per_km": rate,
            "fare": round(float(rate) * distance_km),
            "distance_source": source,
            "route": path,
        })


# ---------------------------------------------------------------- on-demand rides

def _error(detail, code=status.HTTP_400_BAD_REQUEST):
    return Response({"detail": detail}, status=code)


def _ride_queryset():
    return OnDemandRide.objects.select_related("rider", "driver", "driver__ride_profile")


def _expire_unanswered():
    # Lazy, like the trip board: checked whenever someone asks, no scheduled job.
    cutoff = timezone.now() - datetime.timedelta(seconds=NO_DRIVER_AFTER_SECONDS)
    OnDemandRide.objects.filter(status=Status.REQUESTED, created_at__lt=cutoff).update(status=Status.NO_DRIVER)


def _active_ride(user):
    active = _ride_queryset().filter(status__in=OnDemandRide.ACTIVE_STATUSES)
    return active.filter(rider=user).first() or active.filter(driver=user).first()


def _profile(user, role):
    return RideProfile.objects.filter(user=user, role=role).first()


class DriverStatusView(APIView):
    """The driver's phone calls this every 5 seconds: online/offline plus current position."""

    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        profile = _profile(request.user, RideProfile.Role.DRIVER)
        if profile is None or not profile.is_approved:
            return _error("Only approved drivers can go online.", status.HTTP_403_FORBIDDEN)
        serializer = DriverStatusSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data

        if data["is_online"]:
            if "lat" not in data or "lng" not in data:
                return _error("Location is needed to go online.")
            profile.last_lat, profile.last_lng, profile.last_seen = data["lat"], data["lng"], timezone.now()
        elif OnDemandRide.objects.filter(driver=request.user, status__in=OnDemandRide.ACTIVE_STATUSES).exists():
            return _error("Finish or cancel your current ride before going offline.")
        profile.is_online = data["is_online"]
        profile.save(update_fields=["is_online", "last_lat", "last_lng", "last_seen"])
        return Response(RideProfileSerializer(profile).data)


class NearbyRequestsView(APIView):
    """Open ride requests within 5 km of the driver, oldest first."""

    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        profile = _profile(request.user, RideProfile.Role.DRIVER)
        if profile is None or not profile.is_approved:
            return _error("Only approved drivers can see ride requests.", status.HTTP_403_FORBIDDEN)
        _expire_unanswered()
        if not profile.is_live or _active_ride(request.user):
            return Response([])

        nearby = []
        for ride in _ride_queryset().filter(status=Status.REQUESTED).order_by("created_at"):
            distance = haversine_km(profile.last_lat, profile.last_lng, ride.pickup_lat, ride.pickup_lng)
            if distance <= NEARBY_RADIUS_KM:
                ride.pickup_distance_km = round(distance, 1)
                nearby.append(ride)
        return Response(OnDemandRideSerializer(nearby, many=True).data)


class RideCreateView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        profile = _ensure_profile(request.user)
        if profile.role == RideProfile.Role.DRIVER and profile.is_approved:
            return _error("Approved drivers can't request rides.", status.HTTP_403_FORBIDDEN)
        _expire_unanswered()
        if _active_ride(request.user):
            return _error("You already have a ride in progress.")

        serializer = RideRequestSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data
        distance_km, path, _source = route_between(data["pickup_lat"], data["pickup_lng"], data["drop_lat"], data["drop_lng"])
        ride = OnDemandRide.objects.create(
            rider=request.user,
            pickup_label=data["pickup_label"] or "Pinned location",
            pickup_lat=data["pickup_lat"],
            pickup_lng=data["pickup_lng"],
            drop_label=data["drop_label"] or "Pinned location",
            drop_lat=data["drop_lat"],
            drop_lng=data["drop_lng"],
            distance_km=round(distance_km, 1),
            fare=round(float(get_rate_per_km()) * distance_km),
            route=path,
        )
        return Response(OnDemandRideSerializer(_ride_queryset().get(pk=ride.pk)).data, status=status.HTTP_201_CREATED)


class CurrentRideView(APIView):
    """The caller's active ride (as rider or driver) - the screens poll this every 5 seconds."""

    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        _expire_unanswered()
        ride = _active_ride(request.user)
        return Response({"ride": OnDemandRideSerializer(ride).data if ride else None})


class RideDetailView(APIView):
    """Used to show how a ride ended (completed, cancelled, no driver) once it is no longer active."""

    permission_classes = [permissions.IsAuthenticated]

    def get(self, request, pk):
        _expire_unanswered()
        ride = get_object_or_404(_ride_queryset(), pk=pk)
        if request.user.id not in (ride.rider_id, ride.driver_id):
            return _error("This isn't your ride.", status.HTTP_403_FORBIDDEN)
        return Response(OnDemandRideSerializer(ride).data)


class RideAcceptView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, pk):
        profile = _profile(request.user, RideProfile.Role.DRIVER)
        if profile is None or not profile.is_approved:
            return _error("Only approved drivers can accept rides.", status.HTTP_403_FORBIDDEN)
        if not profile.is_live:
            return _error("Go online first.")
        _expire_unanswered()

        with transaction.atomic():
            # The row lock is what makes "first driver wins": a second driver waits here, then sees it taken.
            ride = get_object_or_404(OnDemandRide.objects.select_for_update(), pk=pk)
            if ride.status != Status.REQUESTED:
                return _error("This ride was already taken or cancelled.", status.HTTP_409_CONFLICT)
            if OnDemandRide.objects.filter(driver=request.user, status__in=OnDemandRide.ACTIVE_STATUSES).exists():
                return _error("Finish your current ride first.")
            ride.driver = request.user
            ride.status = Status.ACCEPTED
            ride.accepted_at = timezone.now()
            ride.save(update_fields=["driver", "status", "accepted_at"])

        notify(ride.rider, f"A driver accepted your ride to {ride.drop_label}.", target=ride)
        return Response(OnDemandRideSerializer(_ride_queryset().get(pk=ride.pk)).data)


class DriverStepView(APIView):
    """Driver moves their own ride forward: arrived -> in progress -> completed."""

    permission_classes = [permissions.IsAuthenticated]
    from_status = None
    to_status = None
    rider_message = ""

    def post(self, request, pk):
        with transaction.atomic():
            ride = get_object_or_404(OnDemandRide.objects.select_for_update(), pk=pk)
            if ride.driver_id != request.user.id:
                return _error("Only the driver of this ride can do that.", status.HTTP_403_FORBIDDEN)
            if ride.status != self.from_status:
                return _error(f"This ride is {ride.get_status_display().lower()}, so that isn't possible now.")
            ride.status = self.to_status
            ride.save(update_fields=["status"])

        notify(ride.rider, self.rider_message.format(drop=ride.drop_label), target=ride)
        return Response(OnDemandRideSerializer(_ride_queryset().get(pk=ride.pk)).data)


class RideArrivedView(DriverStepView):
    from_status, to_status = Status.ACCEPTED, Status.ARRIVED
    rider_message = "Your driver has arrived at the pickup point."


class RideStartView(DriverStepView):
    from_status, to_status = Status.ARRIVED, Status.IN_PROGRESS
    rider_message = "Your ride to {drop} has started."


class RideCompleteView(DriverStepView):
    from_status, to_status = Status.IN_PROGRESS, Status.COMPLETED
    rider_message = "You reached {drop}. Please pay the fuel share to your driver."


class RideCancelView(APIView):
    """Either side can cancel. The rider until the trip starts; the driver only after accepting, before the trip starts."""

    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, pk):
        with transaction.atomic():
            ride = get_object_or_404(OnDemandRide.objects.select_for_update(), pk=pk)
            if request.user.id == ride.rider_id:
                side, allowed, other = "rider", [Status.REQUESTED, Status.ACCEPTED, Status.ARRIVED, Status.NO_DRIVER], ride.driver
            elif request.user.id == ride.driver_id:
                side, allowed, other = "driver", [Status.ACCEPTED, Status.ARRIVED], ride.rider
            else:
                return _error("This isn't your ride.", status.HTTP_403_FORBIDDEN)
            if ride.status not in allowed:
                return _error("This ride can't be cancelled now.")
            ride.status = Status.CANCELLED
            ride.cancelled_by = side
            ride.save(update_fields=["status", "cancelled_by"])

        if other:
            notify(other, f"The ride to {ride.drop_label} was cancelled by the {side}.", target=ride)
        return Response(OnDemandRideSerializer(_ride_queryset().get(pk=ride.pk)).data)


class RideRetryView(APIView):
    """After "no driver found" the rider can search again: the same request goes back out to nearby drivers."""

    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, pk):
        with transaction.atomic():
            ride = get_object_or_404(OnDemandRide.objects.select_for_update(), pk=pk)
            if ride.rider_id != request.user.id:
                return _error("This isn't your ride.", status.HTTP_403_FORBIDDEN)
            if ride.status != Status.NO_DRIVER:
                return _error("Only a ride with no driver found can be searched again.")
            if OnDemandRide.objects.filter(rider=request.user, status__in=OnDemandRide.ACTIVE_STATUSES).exists():
                return _error("You already have a ride in progress.")
            ride.status = Status.REQUESTED
            # Restarts the 2-minute wait for an answer.
            ride.created_at = timezone.now()
            ride.save(update_fields=["status", "created_at"])
        return Response(OnDemandRideSerializer(_ride_queryset().get(pk=ride.pk)).data)
