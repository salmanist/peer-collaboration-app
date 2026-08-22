from rest_framework import serializers

from .models import Notification


class NotificationSerializer(serializers.ModelSerializer):
    content_type = serializers.SlugRelatedField(slug_field="model", read_only=True)

    class Meta:
        model = Notification
        fields = ["id", "verb", "content_type", "object_id", "is_read", "created_at"]
        read_only_fields = fields
