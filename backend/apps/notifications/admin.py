from django.contrib import admin
from .models import CampusNotification, UserNotificationState


@admin.register(CampusNotification)
class CampusNotificationAdmin(admin.ModelAdmin):
    list_display = ("title", "category", "priority", "created_by", "created_at", "is_active")
    list_filter = ("category", "priority", "is_active", "created_at")
    search_fields = ("title", "message")


@admin.register(UserNotificationState)
class UserNotificationStateAdmin(admin.ModelAdmin):
    list_display = ("user", "notification", "is_popup_dismissed", "is_read", "dismissed_at", "read_at")
    list_filter = ("is_popup_dismissed", "is_read")
    search_fields = ("user__email", "notification__title")
