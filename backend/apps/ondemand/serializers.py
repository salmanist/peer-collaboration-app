from rest_framework import serializers

from .models import OnDemandRide, PeerRideChatMessage, PeerRideRequest, Place, RideProfile

VEHICLE_FIELDS = ["vehicle_make", "vehicle_model", "vehicle_colour", "plate_number", "vehicle_seats"]


class RideProfileSerializer(serializers.ModelSerializer):
    """Read-only view of a student's on-demand profile."""

    class Meta:
        model = RideProfile
        fields = ["id", "role", *VEHICLE_FIELDS, "is_approved", "is_online", "created_at"]
        read_only_fields = fields


class DriverApplicationSerializer(serializers.ModelSerializer):
    """A rider's application to become a driver: every vehicle detail is required."""

    class Meta:
        model = RideProfile
        fields = VEHICLE_FIELDS
        extra_kwargs = {
            **{name: {"required": True, "allow_blank": False} for name in VEHICLE_FIELDS if name != "vehicle_seats"},
            "vehicle_seats": {"required": True, "allow_null": False},
        }

    def validate_plate_number(self, plate_number):
        return plate_number.strip().upper()


class PlaceSerializer(serializers.ModelSerializer):
    class Meta:
        model = Place
        fields = ["id", "name", "lat", "lng"]


class FareQuoteSerializer(serializers.Serializer):
    pickup_lat = serializers.FloatField(min_value=-90, max_value=90)
    pickup_lng = serializers.FloatField(min_value=-180, max_value=180)
    drop_lat = serializers.FloatField(min_value=-90, max_value=90)
    drop_lng = serializers.FloatField(min_value=-180, max_value=180)


class RideRequestSerializer(serializers.Serializer):
    """What a rider sends to ask for a ride. Fare and route are worked out on the server."""

    pickup_label = serializers.CharField(max_length=100, required=False, allow_blank=True, default="Pinned location")
    pickup_lat = serializers.FloatField(min_value=-90, max_value=90)
    pickup_lng = serializers.FloatField(min_value=-180, max_value=180)
    drop_label = serializers.CharField(max_length=100, required=False, allow_blank=True, default="Pinned location")
    drop_lat = serializers.FloatField(min_value=-90, max_value=90)
    drop_lng = serializers.FloatField(min_value=-180, max_value=180)


class DriverStatusSerializer(serializers.Serializer):
    is_online = serializers.BooleanField()
    lat = serializers.FloatField(min_value=-90, max_value=90, required=False)
    lng = serializers.FloatField(min_value=-180, max_value=180, required=False)


class OnDemandRideSerializer(serializers.ModelSerializer):
    rider = serializers.SerializerMethodField()
    driver = serializers.SerializerMethodField()
    pickup_distance_km = serializers.SerializerMethodField()

    class Meta:
        model = OnDemandRide
        fields = [
            "id", "status", "cancelled_by", "rider", "driver",
            "pickup_label", "pickup_lat", "pickup_lng", "drop_label", "drop_lat", "drop_lng",
            "distance_km", "fare", "route", "pickup_distance_km", "created_at", "accepted_at",
        ]

    def get_rider(self, ride):
        return {"id": ride.rider_id, "full_name": ride.rider.full_name or ride.rider.email}

    def get_driver(self, ride):
        if ride.driver is None:
            return None
        profile = ride.driver.ride_profile
        return {
            "id": ride.driver_id,
            "full_name": ride.driver.full_name or ride.driver.email,
            "vehicle": f"{profile.vehicle_colour} {profile.vehicle_make} {profile.vehicle_model}",
            "plate_number": profile.plate_number,
            "lat": profile.last_lat,
            "lng": profile.last_lng,
        }

    def get_pickup_distance_km(self, ride):
        # Only set by the driver's "nearby requests" list.
        return getattr(ride, "pickup_distance_km", None)


# ---------------------------------------------------------------- peer ride requests

class PeerRideRequestCreateSerializer(serializers.Serializer):
    """What a student sends when posting an immediate lift-share request."""

    kind = serializers.ChoiceField(choices=PeerRideRequest.Kind.choices, default=PeerRideRequest.Kind.NEED_RIDE)
    seats = serializers.IntegerField(min_value=1, max_value=8, default=1)
    departure_time = serializers.CharField(max_length=60, required=False, default="Right now")
    pickup_label = serializers.CharField(max_length=150)
    pickup_lat = serializers.FloatField(min_value=-90, max_value=90, default=31.5204)
    pickup_lng = serializers.FloatField(min_value=-180, max_value=180, default=74.3587)
    drop_label = serializers.CharField(max_length=150)
    drop_lat = serializers.FloatField(min_value=-90, max_value=90, default=31.5204)
    drop_lng = serializers.FloatField(min_value=-180, max_value=180, default=74.3587)
    note = serializers.CharField(max_length=200, required=False, allow_blank=True, default="")


class PeerRideRequestSerializer(serializers.ModelSerializer):
    """Read representation returned to the frontend."""

    poster = serializers.SerializerMethodField()
    responder = serializers.SerializerMethodField()

    class Meta:
        model = PeerRideRequest
        fields = [
            "id", "kind", "seats", "departure_time", "status", "poster", "responder",
            "pickup_label", "pickup_lat", "pickup_lng",
            "drop_label", "drop_lat", "drop_lng",
            "note", "created_at", "accepted_at",
        ]

    def get_poster(self, obj):
        return {"id": obj.poster_id, "full_name": obj.poster.full_name or obj.poster.email}

    def get_responder(self, obj):
        if obj.responder is None:
            return None
        return {"id": obj.responder_id, "full_name": obj.responder.full_name or obj.responder.email}


class PeerRideChatMessageSerializer(serializers.ModelSerializer):
    sender_id = serializers.IntegerField(source="sender.id", read_only=True)
    sender_name = serializers.CharField(source="sender.display_name", read_only=True)
    image = serializers.ImageField(required=False, allow_null=True)

    class Meta:
        model = PeerRideChatMessage
        fields = ["id", "request", "sender_id", "sender_name", "body", "image", "created_at"]
        read_only_fields = ["id", "request", "sender_id", "sender_name", "created_at"]
