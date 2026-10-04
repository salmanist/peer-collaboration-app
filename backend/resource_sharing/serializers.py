from decimal import Decimal
from rest_framework import serializers
from .models import (
    PublicResourceOffer,
    PublicResourceOfferChatMessage,
    PublicResourceRequest,
    ResourceChatMessage,
    ResourceInterestRequest,
    ResourceListing,
)


class ResourceListingSerializer(serializers.ModelSerializer):
    owner_id = serializers.IntegerField(source="owner.id", read_only=True)
    owner_name = serializers.CharField(source="owner.display_name", read_only=True)
    owner_email = serializers.EmailField(source="owner.email", read_only=True)
    owner_department = serializers.CharField(source="owner.department", read_only=True)
    owner_enrollment_year = serializers.CharField(source="owner.enrollment_year", read_only=True)
    has_requested = serializers.SerializerMethodField()
    interest_request_id = serializers.SerializerMethodField()

    def get_has_requested(self, obj) -> bool:
        if "user_interest_requests" in self.context:
            return obj.id in self.context["user_interest_requests"]
        request = self.context.get("request")
        if request and request.user and request.user.is_authenticated:
            return ResourceInterestRequest.objects.filter(resource=obj, requester=request.user).exists()
        return False

    def get_interest_request_id(self, obj):
        if "user_interest_requests" in self.context:
            return self.context["user_interest_requests"].get(obj.id)
        request = self.context.get("request")
        if request and request.user and request.user.is_authenticated:
            req = ResourceInterestRequest.objects.filter(resource=obj, requester=request.user).first()
            return req.id if req else None
        return None

    class Meta:
        model = ResourceListing
        fields = [
            "id",
            "owner_id",
            "owner_name",
            "owner_email",
            "owner_department",
            "owner_enrollment_year",
            "has_requested",
            "interest_request_id",
            "title",
            "category",
            "course",
            "condition",
            "exchange_type",
            "price",
            "image",
            "description",
            "status",
            "created_at",
            "updated_at",
        ]
        read_only_fields = [
            "id",
            "owner_id",
            "owner_name",
            "owner_email",
            "owner_department",
            "owner_enrollment_year",
            "has_requested",
            "interest_request_id",
            "status",
            "created_at",
            "updated_at",
        ]

    def validate(self, attributes):
        exchange_type = attributes.get(
            "exchange_type",
            getattr(self.instance, "exchange_type", None),
        )
        price = attributes.get(
            "price",
            getattr(self.instance, "price", None),
        )

        if exchange_type in {ResourceListing.ExchangeType.SELL, ResourceListing.ExchangeType.RENT} and price is None:
            raise serializers.ValidationError(
                {"price": "Price is required when exchange type is sell or rent."}
            )

        if exchange_type not in {ResourceListing.ExchangeType.SELL, ResourceListing.ExchangeType.RENT}:
            if price not in (None, Decimal("0.00")):
                raise serializers.ValidationError(
                    {"price": "Price is allowed only when exchange type is sell or rent."}
                )

        return attributes


class ResourceInterestRequestSerializer(serializers.ModelSerializer):
    resource_id = serializers.IntegerField(source="resource.id", read_only=True)
    resource_title = serializers.CharField(source="resource.title", read_only=True)
    requester_id = serializers.IntegerField(source="requester.id", read_only=True)
    requester_name = serializers.CharField(source="requester.display_name", read_only=True)


    class Meta:
        model = ResourceInterestRequest
        fields = [
            "id",
            "resource_id",
            "resource_title",
            "requester_id",
            "requester_name",
            "message",
            "status",
            "created_at",
            "updated_at",
        ]
        read_only_fields = [
            "id",
            "resource_id",
            "resource_title",
            "requester_id",
            "requester_name",
            "status",
            "created_at",
            "updated_at",
        ]


class ResourceListingStatusSerializer(serializers.ModelSerializer):
    class Meta:
        model = ResourceListing
        fields = ["status"]


class PublicResourceRequestSerializer(serializers.ModelSerializer):
    requester_id = serializers.IntegerField(source="requester.id", read_only=True)
    requester_name = serializers.CharField(source="requester.display_name", read_only=True)
    requester_email = serializers.EmailField(source="requester.email", read_only=True)
    requester_department = serializers.CharField(source="requester.department", read_only=True)
    requester_enrollment_year = serializers.CharField(source="requester.enrollment_year", read_only=True)

    class Meta:
        model = PublicResourceRequest
        fields = [
            "id",
            "requester_id",
            "requester_name",
            "requester_email",
            "requester_department",
            "requester_enrollment_year",
            "title",
            "category",
            "course",
            "desired_exchange_type",
            "description",
            "status",
            "created_at",
            "updated_at",
        ]
        read_only_fields = [
            "id",
            "requester_id",
            "requester_name",
            "requester_email",
            "requester_department",
            "requester_enrollment_year",
            "status",
            "created_at",
            "updated_at",
        ]


class PublicResourceRequestStatusSerializer(serializers.ModelSerializer):
    class Meta:
        model = PublicResourceRequest
        fields = ["status"]


class PublicResourceOfferSerializer(serializers.ModelSerializer):
    public_request_id = serializers.IntegerField(source="public_request.id", read_only=True)
    public_request_title = serializers.CharField(source="public_request.title", read_only=True)
    offerer_id = serializers.IntegerField(source="offerer.id", read_only=True)
    offerer_name = serializers.CharField(source="offerer.display_name", read_only=True)

    class Meta:
        model = PublicResourceOffer
        fields = [
            "id",
            "public_request_id",
            "public_request_title",
            "offerer_id",
            "offerer_name",
            "message",
            "status",
            "created_at",
            "updated_at",
        ]
        read_only_fields = [
            "id",
            "public_request_id",
            "public_request_title",
            "offerer_id",
            "offerer_name",
            "status",
            "created_at",
            "updated_at",
        ]


class PublicResourceOfferChatMessageSerializer(serializers.ModelSerializer):
    sender_id = serializers.IntegerField(source="sender.id", read_only=True)
    sender_name = serializers.CharField(source="sender.display_name", read_only=True)
    image = serializers.ImageField(required=False, allow_null=True)

    class Meta:
        model = PublicResourceOfferChatMessage
        fields = ["id", "public_offer", "sender_id", "sender_name", "body", "image", "created_at"]
        read_only_fields = ["id", "public_offer", "sender_id", "sender_name", "created_at"]


class ResourceChatMessageSerializer(serializers.ModelSerializer):
    sender_id = serializers.IntegerField(source="sender.id", read_only=True)
    sender_name = serializers.CharField(source="sender.display_name", read_only=True)
    image = serializers.ImageField(required=False, allow_null=True)

    class Meta:
        model = ResourceChatMessage
        fields = ["id", "interest_request", "sender_id", "sender_name", "body", "image", "created_at"]
        read_only_fields = ["id", "interest_request", "sender_id", "sender_name", "created_at"]
