from django.urls import path

from .views import (
    AdminNotificationDetailView,
    AdminNotificationListCreateView,
    DismissPopupView,
    MarkAllReadView,
    MarkReadView,
    StudentNotificationListView,
)

urlpatterns = [
    path("", StudentNotificationListView.as_view(), name="notification-list"),
    path("<uuid:notification_id>/dismiss-popup/", DismissPopupView.as_view(), name="notification-dismiss-popup"),
    path("<uuid:notification_id>/mark-read/", MarkReadView.as_view(), name="notification-mark-read"),
    path("mark-all-read/", MarkAllReadView.as_view(), name="notification-mark-all-read"),
    path("admin/", AdminNotificationListCreateView.as_view(), name="admin-notification-list-create"),
    path("admin/<uuid:notification_id>/", AdminNotificationDetailView.as_view(), name="admin-notification-detail"),
]
