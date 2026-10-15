from rest_framework import serializers

from .models import OnDemandRide, Place, RideProfile

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
