import datetime
import time

from django.db import transaction
from django.db.models import Q
from django.shortcuts import get_object_or_404
from django.utils import timezone
from asgiref.sync import async_to_sync
from channels.layers import get_channel_layer
from rest_framework import generics, parsers, permissions, status
from rest_framework.exceptions import PermissionDenied, ValidationError
from rest_framework.response import Response
from rest_framework.views import APIView

from common.geo import haversine_km
from common.notifications import notify

from .fare import route_between
from .models import OnDemandRide, PeerRideChatMessage, PeerRideRequest, Place, RideProfile, get_rate_per_km, reset_to_rider
from .serializers import (
    DriverApplicationSerializer,
    DriverStatusSerializer,
    FareQuoteSerializer,
    OnDemandRideSerializer,
    PeerRideChatMessageSerializer,
    PeerRideRequestCreateSerializer,
    PeerRideRequestSerializer,
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


_LAST_ON_DEMAND_EXPIRY = 0


def _expire_unanswered():
    # Lazy, like the trip board: checked on read, throttled to at most once per 30 seconds
    # to avoid repetitive write queries on every poll.
    global _LAST_ON_DEMAND_EXPIRY
    now = time.time()
    if now - _LAST_ON_DEMAND_EXPIRY < 30:
        return
    _LAST_ON_DEMAND_EXPIRY = now
    cutoff = timezone.now() - datetime.timedelta(seconds=NO_DRIVER_AFTER_SECONDS)
    OnDemandRide.objects.filter(status=Status.REQUESTED, created_at__lt=cutoff).update(status=Status.NO_DRIVER)


def _active_ride(user):
    return _ride_queryset().filter(status__in=OnDemandRide.ACTIVE_STATUSES).filter(Q(rider=user) | Q(driver=user)).first()


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


# ---------------------------------------------------------------- peer ride requests (lift-share board)

_LAST_PEER_EXPIRY = 0


def _expire_peer_requests():
    """Throttled: marks OPEN requests older than EXPIRE_MINUTES as cancelled (no responder)."""
    global _LAST_PEER_EXPIRY
    now = time.time()
    if now - _LAST_PEER_EXPIRY < 60:
        return
    _LAST_PEER_EXPIRY = now
    cutoff = timezone.now() - datetime.timedelta(minutes=PeerRideRequest.EXPIRE_MINUTES)
    PeerRideRequest.objects.filter(status=PeerRideRequest.Status.OPEN, created_at__lt=cutoff).exclude(
        poster__email__startswith="fello."
    ).update(status=PeerRideRequest.Status.CANCELLED)


def _peer_qs():
    return PeerRideRequest.objects.select_related("poster", "responder")


class PeerRideRequestListCreateView(APIView):
    """
    GET  – list all OPEN peer ride requests (visible to everyone).
    POST – post a new immediate lift-share request.
    """

    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        _expire_peer_requests()
        qs = _peer_qs().filter(status=PeerRideRequest.Status.OPEN).order_by("-created_at")
        return Response(PeerRideRequestSerializer(qs, many=True).data)

    def post(self, request):
        _expire_peer_requests()
        # A student can't have more than one OPEN request at a time.
        if PeerRideRequest.objects.filter(poster=request.user, status=PeerRideRequest.Status.OPEN).exists():
            return _error("You already have an open ride request. Cancel it before posting another.")
        serializer = PeerRideRequestCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data
        obj = PeerRideRequest.objects.create(
            poster=request.user,
            kind=data.get("kind", PeerRideRequest.Kind.NEED_RIDE),
            seats=data.get("seats", 1),
            departure_time=data.get("departure_time", "Right now"),
            pickup_label=data["pickup_label"],
            pickup_lat=data["pickup_lat"],
            pickup_lng=data["pickup_lng"],
            drop_label=data["drop_label"],
            drop_lat=data["drop_lat"],
            drop_lng=data["drop_lng"],
            note=data.get("note", ""),
        )
        return Response(PeerRideRequestSerializer(_peer_qs().get(pk=obj.pk)).data, status=status.HTTP_201_CREATED)


class PeerRideRequestDetailView(APIView):
    """
    GET    – fetch one request (poster or responder only).
    DELETE – poster cancels their own OPEN request.
    """

    permission_classes = [permissions.IsAuthenticated]

    def _get_obj(self, pk):
        return get_object_or_404(_peer_qs(), pk=pk)

    def get(self, request, pk):
        obj = self._get_obj(pk)
        if request.user.id not in (obj.poster_id, obj.responder_id):
            return _error("This isn't your request.", status.HTTP_403_FORBIDDEN)
        return Response(PeerRideRequestSerializer(obj).data)

    def delete(self, request, pk):
        obj = self._get_obj(pk)
        if obj.poster_id != request.user.id:
            return _error("Only the poster can cancel this request.", status.HTTP_403_FORBIDDEN)
        if obj.status != PeerRideRequest.Status.OPEN:
            return _error("Only OPEN requests can be cancelled.")
        obj.status = PeerRideRequest.Status.CANCELLED
        obj.save(update_fields=["status"])
        return Response(PeerRideRequestSerializer(obj).data)


class PeerRideRequestRespondView(APIView):
    """Any peer (not the poster) can respond to say 'I'll take you'."""

    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, pk):
        with transaction.atomic():
            obj = get_object_or_404(PeerRideRequest.objects.select_for_update(), pk=pk)
            if obj.poster_id == request.user.id:
                return _error("You can't respond to your own request.")
            if obj.status != PeerRideRequest.Status.OPEN:
                return _error("This request is no longer open.", status.HTTP_409_CONFLICT)
            obj.responder = request.user
            obj.status = PeerRideRequest.Status.ACCEPTED
            obj.accepted_at = timezone.now()
            obj.save(update_fields=["responder", "status", "accepted_at"])
        notify(obj.poster, f"{request.user.full_name or request.user.email} can take you to {obj.drop_label}!", target=obj)
        return Response(PeerRideRequestSerializer(_peer_qs().get(pk=obj.pk)).data)


class PeerRideRequestCompleteView(APIView):
    """Poster marks the ride as completed once they've reached their destination."""

    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, pk):
        obj = get_object_or_404(_peer_qs(), pk=pk)
        if obj.poster_id != request.user.id:
            return _error("Only the poster can mark this ride as completed.", status.HTTP_403_FORBIDDEN)
        if obj.status != PeerRideRequest.Status.ACCEPTED:
            return _error("Only an accepted ride can be marked completed.")
        obj.status = PeerRideRequest.Status.COMPLETED
        obj.save(update_fields=["status"])
        return Response(PeerRideRequestSerializer(obj).data)


class PeerRideChatMessageListView(generics.ListCreateAPIView):
    serializer_class = PeerRideChatMessageSerializer
    permission_classes = [permissions.IsAuthenticated]
    parser_classes = [parsers.MultiPartParser, parsers.FormParser, parsers.JSONParser]

    def get_ride_request(self):
        req = get_object_or_404(
            PeerRideRequest.objects.select_related("poster", "responder"),
            pk=self.kwargs["request_id"],
        )
        is_participant = self.request.user.id in {req.poster_id, req.responder_id}
        if not is_participant:
            raise PermissionDenied("You are not a participant in this ride.")
        return req

    def get_queryset(self):
        req = self.get_ride_request()
        return PeerRideChatMessage.objects.select_related("sender").filter(request=req)

    def perform_create(self, serializer):
        req = self.get_ride_request()
        body = self.request.data.get("body", "")
        if isinstance(body, str):
            body = body.strip()
        image = self.request.FILES.get("image")
        if not body and not image:
            raise ValidationError({"detail": "Message must contain text or an image."})

        message = serializer.save(
            request=req,
            sender=self.request.user,
            body=body,
            image=image,
        )

        channel_layer = get_channel_layer()
        if channel_layer:
            group_name = f"peer_ride_chat_{req.id}"
            image_url = None
            if message.image:
                image_url = message.image.url
            async_to_sync(channel_layer.group_send)(
                group_name,
                {
                    "type": "chat.message",
                    "message": {
                        "id": message.id,
                        "request": req.id,
                        "sender_id": self.request.user.id,
                        "sender_name": self.request.user.display_name,
                        "body": message.body,
                        "image": image_url,
                        "created_at": message.created_at.isoformat(),
                    },
                },
            )
