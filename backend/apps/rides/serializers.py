from django.utils import timezone
from rest_framework import serializers

from accounts.models import User

from .models import Ride, RideJoinRequest


class RideUserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ["id", "email", "full_name"]


class RideSerializer(serializers.ModelSerializer):
    offerer = RideUserSerializer(read_only=True)
    my_request_status = serializers.SerializerMethodField()

    class Meta:
        model = Ride
        fields = [
            "id", "offerer", "departure", "destination",
            "departure_lat", "departure_lng", "destination_lat", "destination_lng",
            "departure_date", "departure_time",
            "seats_total", "seats_available", "same_gender_only", "is_cancelled",
            "my_request_status", "created_at",
        ]
        read_only_fields = ["id", "offerer", "seats_available", "is_cancelled", "created_at"]

    def get_my_request_status(self, ride):
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
        if same_gender_only and not self.context["request"].user.gender:
            raise serializers.ValidationError(
                "Set your gender in your profile roster record before restricting a ride."
            )
        return same_gender_only

    def validate(self, attrs):
        for lat_key, lng_key in [("departure_lat", "departure_lng"), ("destination_lat", "destination_lng")]:
            if (attrs.get(lat_key) is None) != (attrs.get(lng_key) is None):
                raise serializers.ValidationError(f"{lat_key} and {lng_key} must be provided together.")
        return attrs

    def create(self, validated_data):
        validated_data["seats_available"] = validated_data["seats_total"]
        return super().create(validated_data)


class RideJoinRequestSerializer(serializers.ModelSerializer):
    requester = RideUserSerializer(read_only=True)

    class Meta:
        model = RideJoinRequest
        fields = ["id", "ride", "requester", "status", "created_at"]
        read_only_fields = ["id", "ride", "requester", "status", "created_at"]
