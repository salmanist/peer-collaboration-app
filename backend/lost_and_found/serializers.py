from rest_framework import serializers

from .models import ItemClaim, ItemClaimChatMessage, LostAndFoundItem


class LostAndFoundItemSerializer(serializers.ModelSerializer):
    poster_id = serializers.IntegerField(source="poster.id", read_only=True)
    poster_name = serializers.CharField(source="poster.display_name", read_only=True)
    poster_email = serializers.CharField(source="poster.email", read_only=True)
    poster_department = serializers.CharField(source="poster.department", read_only=True)
    claims_count = serializers.SerializerMethodField()
    has_user_claimed = serializers.SerializerMethodField()
    image = serializers.ImageField(required=False, allow_null=True)


    class Meta:
        model = LostAndFoundItem
        fields = [
            "id",
            "poster_id",
            "poster_name",
            "poster_email",
            "poster_department",
            "post_type",
            "title",
            "category",
            "location",
            "date_lost_or_found",
            "description",
            "image",
            "status",
            "claims_count",
            "has_user_claimed",
            "created_at",
            "updated_at",
        ]
        read_only_fields = [
            "id",
            "poster_id",
            "poster_name",
            "poster_email",
            "poster_department",
            "claims_count",
            "has_user_claimed",
            "created_at",
            "updated_at",
        ]

    def get_claims_count(self, obj) -> int:
        if hasattr(obj, "claims_count_annotated"):
            return obj.claims_count_annotated
        return obj.claims.count()

    def get_has_user_claimed(self, obj) -> bool:
        request = self.context.get("request")
        if not request or not request.user.is_authenticated:
            return False
        return obj.claims.filter(claimant=request.user).exists()


class LostAndFoundItemStatusSerializer(serializers.ModelSerializer):
    class Meta:
        model = LostAndFoundItem
        fields = ["status"]


class ItemClaimSerializer(serializers.ModelSerializer):
    item_id = serializers.IntegerField(source="item.id", read_only=True)
    item_title = serializers.CharField(source="item.title", read_only=True)
    item_post_type = serializers.CharField(source="item.post_type", read_only=True)
    item_location = serializers.CharField(source="item.location", read_only=True)
    item_image = serializers.SerializerMethodField()
    poster_id = serializers.IntegerField(source="item.poster.id", read_only=True)
    poster_name = serializers.CharField(source="item.poster.display_name", read_only=True)
    claimant_id = serializers.IntegerField(source="claimant.id", read_only=True)
    claimant_name = serializers.CharField(source="claimant.display_name", read_only=True)
    claimant_email = serializers.CharField(source="claimant.email", read_only=True)
    claimant_department = serializers.CharField(source="claimant.department", read_only=True)

    class Meta:
        model = ItemClaim
        fields = [
            "id",
            "item_id",
            "item_title",
            "item_post_type",
            "item_location",
            "item_image",
            "poster_id",
            "poster_name",
            "claimant_id",
            "claimant_name",
            "claimant_email",
            "claimant_department",
            "message",
            "status",
            "created_at",
            "updated_at",
        ]
        read_only_fields = [
            "id",
            "item_id",
            "item_title",
            "item_post_type",
            "item_location",
            "item_image",
            "poster_id",
            "poster_name",
            "claimant_id",
            "claimant_name",
            "claimant_email",
            "claimant_department",
            "created_at",
            "updated_at",
        ]

    def get_item_image(self, obj):
        if obj.item.image:
            return obj.item.image.url
        return None


class ItemClaimStatusSerializer(serializers.ModelSerializer):
    class Meta:
        model = ItemClaim
        fields = ["status"]


class ItemClaimChatMessageSerializer(serializers.ModelSerializer):
    sender_id = serializers.IntegerField(source="sender.id", read_only=True)
    sender_name = serializers.CharField(source="sender.display_name", read_only=True)
    image = serializers.ImageField(required=False, allow_null=True)


    class Meta:
        model = ItemClaimChatMessage
        fields = ["id", "claim", "sender_id", "sender_name", "body", "image", "created_at"]
        read_only_fields = ["id", "claim", "sender_id", "sender_name", "created_at"]
