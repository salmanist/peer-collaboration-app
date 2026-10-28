from rest_framework import serializers
from .models import CampusNotification, UserNotificationState


class CampusNotificationSerializer(serializers.ModelSerializer):
    created_by_name = serializers.SerializerMethodField()
    is_popup_dismissed = serializers.SerializerMethodField()
    is_read = serializers.SerializerMethodField()
    # True for admin broadcasts to everyone (no target student), so the app can make them stand out.
    is_broadcast = serializers.SerializerMethodField()

    class Meta:
        model = CampusNotification
        fields = [
            "id",
            "title",
            "message",
            "category",
            "priority",
            "action_url",
            "image",
            "created_by",
            "created_by_name",
            "created_at",
            "is_active",
            "is_popup_dismissed",
            "is_read",
            "is_broadcast",
        ]
        read_only_fields = ["id", "created_by", "created_at"]

    def get_is_broadcast(self, obj):
        return obj.target_user_id is None

    def get_created_by_name(self, obj):
        if obj.created_by:
            return (
                getattr(obj.created_by, "full_name", None)
                or getattr(obj.created_by, "display_name", None)
                or obj.created_by.email
            )
        return "LGU Administration"

    def get_is_popup_dismissed(self, obj):
        if "user_states" in self.context:
            state = self.context["user_states"].get(obj.id)
            return state.is_popup_dismissed if state else False
        user = self.context.get("request").user if self.context.get("request") else None
        if user and user.is_authenticated:
            state = obj.user_states.filter(user=user).first()
            return state.is_popup_dismissed if state else False
        return False

    def get_is_read(self, obj):
        if "user_states" in self.context:
            state = self.context["user_states"].get(obj.id)
            return state.is_read if state else False
        user = self.context.get("request").user if self.context.get("request") else None
        if user and user.is_authenticated:
            state = obj.user_states.filter(user=user).first()
            return state.is_read if state else False
        return False


class CreateCampusNotificationSerializer(serializers.ModelSerializer):
    class Meta:
        model = CampusNotification
        fields = [
            "title",
            "message",
            "category",
            "priority",
            "action_url",
            "image",
        ]
