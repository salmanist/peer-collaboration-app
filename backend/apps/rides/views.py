from django.db import IntegrityError, transaction
from django.db.models import Q
from django.shortcuts import get_object_or_404
from rest_framework import generics, permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView

from accounts.models import StudentRoster
from common.geo import haversine_km
from common.notifications import notify

from .models import Ride, RideJoinRequest
from .serializers import RideJoinRequestSerializer, RideSerializer

RIDE_MATCH_RADIUS_KM = 5


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


class RideListCreateView(generics.ListCreateAPIView):
    serializer_class = RideSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        params = self.request.query_params
        queryset = Ride.objects.filter(seats_available__gt=0, is_cancelled=False).select_related("offerer")

        date = params.get("date")
        if date:
            queryset = queryset.filter(departure_date=date)

        # Same-gender-only rides simply don't surface for a mismatched (or blank-gender) seeker.
        # gender lives on StudentRoster now, not User, so match offerers by email membership.
        matching_gender_emails = StudentRoster.objects.filter(gender=user.gender).values("email")
        queryset = queryset.filter(Q(same_gender_only=False) | Q(offerer__email__in=matching_gender_emails))
        queryset = queryset.order_by("departure_date", "departure_time")

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
        serializer.save(offerer=self.request.user)


class RideDetailView(generics.RetrieveAPIView):
    queryset = Ride.objects.select_related("offerer")
    serializer_class = RideSerializer
    permission_classes = [permissions.IsAuthenticated]


class MyRidesView(generics.ListAPIView):
    serializer_class = RideSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        # Every ride the caller has offered, any status — unlike the public list, this
        # includes full and cancelled rides so the offerer can track their own history.
        return Ride.objects.filter(offerer=self.request.user).select_related("offerer").order_by("-created_at")


class RideCancelView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, pk):
        ride = get_object_or_404(Ride, pk=pk)
        if ride.offerer != request.user:
            return Response({"detail": "Only the offerer can cancel this ride."}, status=status.HTTP_403_FORBIDDEN)
        if ride.is_cancelled:
            return Response({"detail": "This ride is already cancelled."}, status=status.HTTP_400_BAD_REQUEST)
        if ride.join_requests.filter(status=RideJoinRequest.Status.ACCEPTED).exists():
            return Response(
                {"detail": "Can't cancel a ride that already has an accepted rider."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        ride.is_cancelled = True
        ride.save(update_fields=["is_cancelled"])

        for pending in ride.join_requests.filter(status=RideJoinRequest.Status.PENDING).select_related("requester"):
            notify(pending.requester, f"The ride to {ride.destination} you requested was cancelled.", target=ride)

        return Response(RideSerializer(ride, context={"request": request}).data)


class RideJoinView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, pk):
        ride = get_object_or_404(Ride, pk=pk)
        requester = request.user

        if ride.offerer == requester:
            return Response({"detail": "You can't request to join your own ride."}, status=status.HTTP_400_BAD_REQUEST)
        if ride.seats_available <= 0 or ride.is_cancelled:
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
        return ride.join_requests.select_related("requester").order_by("-created_at")

    def list(self, request, *args, **kwargs):
        ride = get_object_or_404(Ride, pk=self.kwargs["pk"])
        if ride.offerer != request.user:
            return Response({"detail": "Only the offerer can view join requests."}, status=status.HTTP_403_FORBIDDEN)
        return super().list(request, *args, **kwargs)


class RideJoinRequestAcceptView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, pk):
        join_request = get_object_or_404(RideJoinRequest, pk=pk)
        if join_request.ride.offerer != request.user:
            return Response({"detail": "Only the offerer can accept join requests."}, status=status.HTTP_403_FORBIDDEN)

        with transaction.atomic():
            ride = Ride.objects.select_for_update().get(pk=join_request.ride_id)
            locked_request = RideJoinRequest.objects.select_for_update().get(pk=join_request.pk)

            if locked_request.status != RideJoinRequest.Status.PENDING:
                return Response({"detail": "This request has already been handled."}, status=status.HTTP_400_BAD_REQUEST)
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
        join_request = get_object_or_404(RideJoinRequest, pk=pk)
        if join_request.ride.offerer != request.user:
            return Response({"detail": "Only the offerer can decline join requests."}, status=status.HTTP_403_FORBIDDEN)
        if join_request.status != RideJoinRequest.Status.PENDING:
            return Response({"detail": "This request has already been handled."}, status=status.HTTP_400_BAD_REQUEST)

        join_request.status = RideJoinRequest.Status.DECLINED
        join_request.save(update_fields=["status"])

        notify(join_request.requester, f"Your request to join the ride to {join_request.ride.destination} was declined.", target=join_request)

        return Response(RideJoinRequestSerializer(join_request).data)
