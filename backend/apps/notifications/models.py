import uuid
from django.conf import settings
from django.db import models


class CampusNotification(models.Model):
    PRIORITY_CHOICES = (
        ("normal", "Normal"),
        ("high", "High"),
        ("urgent", "Urgent"),
    )

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    title = models.CharField(max_length=200)
    message = models.TextField()
    category = models.CharField(max_length=30, default="general")
    priority = models.CharField(max_length=20, choices=PRIORITY_CHOICES, default="normal")
    action_url = models.CharField(max_length=500, blank=True, null=True)
    image = models.ImageField(upload_to="notifications/", null=True, blank=True)

    # When target_user is null, this is a platform-wide broadcast.
    # When target_user is set, this is a targeted direct notification (e.g. session request, claim, marketplace inquiry).
    target_user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name="direct_notifications",
    )

    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="broadcast_notifications",
    )
    created_at = models.DateTimeField(auto_now_add=True)
    is_active = models.BooleanField(default=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        target_str = f" -> {self.target_user.email}" if self.target_user else " [Broadcast]"
        return f"{self.title}{target_str}"


class UserNotificationState(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="notification_states",
    )
    notification = models.ForeignKey(
        CampusNotification,
        on_delete=models.CASCADE,
        related_name="user_states",
    )
    is_popup_dismissed = models.BooleanField(default=False)
    is_read = models.BooleanField(default=False)
    dismissed_at = models.DateTimeField(null=True, blank=True)
    read_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        unique_together = ("user", "notification")

    def __str__(self):
        return f"User {self.user_id} - Notif {self.notification_id} (Dismissed: {self.is_popup_dismissed}, Read: {self.is_read})"


def create_user_notification(
    recipient,
    title: str,
    message: str,
    priority: str = "normal",
    sender=None,
    action_url: str = "",
) -> CampusNotification:
    """Helper to dispatch a personal in-app alert & notification to a student."""
    return CampusNotification.objects.create(
        target_user=recipient,
        created_by=sender,
        title=title,
        message=message,
        priority=priority,
        action_url=action_url,
    )
