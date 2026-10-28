import datetime

from django.utils import timezone
from rest_framework import serializers

from accounts.models import User, prime_roster_cache
from common.geo import haversine_km

from .models import Location, Ride, RideChatMessage, RideJoinRequest

# A pin refining a curated area may sit at most this far from the area's centre.
PIN_MAX_DISTANCE_KM = 5
# (min lat, max lat, min lng, max lng)
LAHORE_BOX = (31.2, 31.8, 73.9, 74.7)


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
    my_request_id = serializers.SerializerMethodField()
    chat_active = serializers.SerializerMethodField()
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
            "my_request_status", "my_request_id", "chat_active", "pending_request_count", "created_at",
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

    def get_chat_active(self, ride):
        """True while the caller has a live chat on this ride (driver with an accepted rider, or the accepted rider)."""
        flag = getattr(ride, "chat_flag", None)  # precomputed by the list query
        if flag is not None:
            return bool(flag)
        request = self.context.get("request")
        if ride.status not in (Ride.Status.OPEN, Ride.Status.IN_PROGRESS) or request is None or not request.user.is_authenticated:
            return False
        accepted = ride.join_requests.filter(status=RideJoinRequest.Status.ACCEPTED)
        if ride.offerer_id != request.user.id:
            accepted = accepted.filter(requester=request.user)
        return accepted.exists()

    def get_my_request_id(self, ride):
        """The caller's accepted join request - what the carpool chat is keyed on (None until accepted)."""
        statuses = self.context.get("user_join_request_statuses")
        if statuses is not None and statuses.get(ride.id) != RideJoinRequest.Status.ACCEPTED:
            return None
        request = self.context.get("request")
        if request is None or not request.user.is_authenticated:
            return None
        return ride.join_requests.filter(requester=request.user, status=RideJoinRequest.Status.ACCEPTED).values_list("id", flat=True).first()

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
        # Each leg is either a curated Location (its coordinates win), a curated Location
        # refined by an exact pin near it, or a pin on its own inside the Lahore box.
        for text_key, lat_key, lng_key in [
            ("departure", "departure_lat", "departure_lng"),
            ("destination", "destination_lat", "destination_lng"),
        ]:
            text = attrs.get(text_key)
            if text is None:
                continue
            lat, lng = attrs.get(lat_key), attrs.get(lng_key)
            if (lat is None) != (lng is None):
                raise serializers.ValidationError({text_key: "Send both latitude and longitude for a pin."})
            text = text.strip()
            location = Location.objects.filter(name__iexact=text).first()
            if lat is None:
                if location is None:
                    raise serializers.ValidationError({text_key: "Pick a location from the suggestions."})
                attrs[text_key], attrs[lat_key], attrs[lng_key] = location.name, location.lat, location.lng
            elif location is not None:
                if haversine_km(location.lat, location.lng, lat, lng) > PIN_MAX_DISTANCE_KM:
                    raise serializers.ValidationError({text_key: "Pin is too far from the chosen area."})
                attrs[text_key] = location.name
            else:
                if not text:
                    raise serializers.ValidationError({text_key: "Name your pinned location."})
                # ponytail: a rectangle around Lahore, not a real boundary; swap for a polygon if the service area grows.
                if not (LAHORE_BOX[0] <= lat <= LAHORE_BOX[1] and LAHORE_BOX[2] <= lng <= LAHORE_BOX[3]):
                    raise serializers.ValidationError({text_key: "Pin must be inside Lahore."})
                attrs[text_key] = text

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


class RideChatMessageSerializer(serializers.ModelSerializer):
    request = serializers.IntegerField(source="join_request_id", read_only=True)
    sender_id = serializers.IntegerField(source="sender.id", read_only=True)
    sender_name = serializers.CharField(source="sender.display_name", read_only=True)
    image = serializers.ImageField(required=False, allow_null=True)

    class Meta:
        model = RideChatMessage
        fields = ["id", "request", "sender_id", "sender_name", "body", "image", "created_at"]
        read_only_fields = ["id", "request", "sender_id", "sender_name", "created_at"]

