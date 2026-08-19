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
    owner_name = serializers.CharField(source="owner.full_name", read_only=True)

    class Meta:
        model = ResourceListing
        fields = [
            "id",
            "owner_id",
            "owner_name",
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
    requester_name = serializers.CharField(source="requester.full_name", read_only=True)


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
    requester_name = serializers.CharField(source="requester.full_name", read_only=True)

    class Meta:
        model = PublicResourceRequest
        fields = [
            "id",
            "requester_id",
            "requester_name",
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
    offerer_name = serializers.CharField(source="offerer.full_name", read_only=True)

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
    sender_name = serializers.CharField(source="sender.full_name", read_only=True)
    image = serializers.ImageField(required=False, allow_null=True)

    class Meta:
        model = PublicResourceOfferChatMessage
        fields = ["id", "public_offer", "sender_id", "sender_name", "body", "image", "created_at"]
        read_only_fields = ["id", "public_offer", "sender_id", "sender_name", "created_at"]


class ResourceChatMessageSerializer(serializers.ModelSerializer):
    sender_id = serializers.IntegerField(source="sender.id", read_only=True)
    sender_name = serializers.CharField(source="sender.full_name", read_only=True)
    image = serializers.ImageField(required=False, allow_null=True)

    class Meta:
        model = ResourceChatMessage
        fields = ["id", "interest_request", "sender_id", "sender_name", "body", "image", "created_at"]
        read_only_fields = ["id", "interest_request", "sender_id", "sender_name", "created_at"]

