import datetime

from django.utils import timezone
from rest_framework import serializers

from accounts.models import User, prime_roster_cache

from .models import Location, Ride, RideJoinRequest


class RideUserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ["id", "email", "full_name"]


class LocationSerializer(serializers.ModelSerializer):
    class Meta:
        model = Location
        fields = ["id", "name", "lat", "lng"]


class RideListSerializer(serializers.ListSerializer):
    def to_representation(self, data):
        offerers = [getattr(item, "offerer", None) for item in (data if hasattr(data, "__iter__") else [])]
        prime_roster_cache([u for u in offerers if u is not None])
        return super().to_representation(data)


class RideSerializer(serializers.ModelSerializer):
    offerer = RideUserSerializer(read_only=True)
    my_request_status = serializers.SerializerMethodField()
    pending_request_count = serializers.SerializerMethodField()

    class Meta:
        model = Ride
        list_serializer_class = RideListSerializer
        fields = [
            "id", "offerer", "departure", "destination",
            "departure_lat", "departure_lng", "destination_lat", "destination_lng",
            "departure_date", "departure_time",
            "seats_total", "seats_available", "same_gender_only", "status",
            "started_at", "completed_at",
            "my_request_status", "pending_request_count", "created_at",
        ]
        read_only_fields = ["id", "offerer", "seats_available", "status", "started_at", "completed_at", "created_at"]

    def get_pending_request_count(self, ride):
        request = self.context.get("request")
        if request is None or ride.offerer_id != request.user.id:
            return None
        counts = self.context.get("pending_request_counts")
        if counts is not None:
            return counts.get(ride.id, 0)
        return ride.join_requests.filter(status="pending").count()

    def get_my_request_status(self, ride):
        statuses = self.context.get("user_join_request_statuses")
        if statuses is not None:
            return statuses.get(ride.id)
        request = self.context.get("request")
        if request is None or not request.user.is_authenticated:
            return None
        join_request = ride.join_requests.filter(requester=request.user).first()
        return join_request.status if join_request else None

    def validate_departure_date(self, departure_date):
        if departure_date < timezone.localdate():
            raise serializers.ValidationError("Departure date can't be in the past.")
        return departure_date

    def validate_same_gender_only(self, same_gender_only):
        if same_gender_only and self.context["request"].user.gender not in ("male", "female"):
            raise serializers.ValidationError(
                "Set your gender in your profile roster record before restricting a ride."
            )
        return same_gender_only

    def validate(self, attrs):
        # departure/destination must be a location picked from the Location table, never
        # freeform text — resolve each against it and overwrite whatever lat/lng the client
        # sent with the curated coordinates, so search radius math is never trusting user input.
        for text_key, lat_key, lng_key in [
            ("departure", "departure_lat", "departure_lng"),
            ("destination", "destination_lat", "destination_lng"),
        ]:
            text = attrs.get(text_key)
            if text is None:
                continue
            location = Location.objects.filter(name__iexact=text.strip()).first()
            if location is None:
                raise serializers.ValidationError({text_key: "Pick a location from the suggestions."})
            attrs[text_key] = location.name
            attrs[lat_key] = location.lat
            attrs[lng_key] = location.lng

        departure_date = attrs.get("departure_date")
        departure_time = attrs.get("departure_time")
        if departure_date and departure_time:
            departure_dt = timezone.make_aware(datetime.datetime.combine(departure_date, departure_time))
            if departure_dt < timezone.now():
                raise serializers.ValidationError("Departure time can't be in the past.")

        return attrs

    def create(self, validated_data):
        validated_data["seats_available"] = validated_data["seats_total"]
        return super().create(validated_data)


class RideJoinRequestListSerializer(serializers.ListSerializer):
    def to_representation(self, data):
        requesters = [getattr(item, "requester", None) for item in (data if hasattr(data, "__iter__") else [])]
        prime_roster_cache([u for u in requesters if u is not None])
        return super().to_representation(data)


class RideJoinRequestSerializer(serializers.ModelSerializer):
    requester = RideUserSerializer(read_only=True)

    class Meta:
        model = RideJoinRequest
        list_serializer_class = RideJoinRequestListSerializer
        fields = ["id", "ride", "requester", "status", "created_at"]
        read_only_fields = ["id", "ride", "requester", "status", "created_at"]
