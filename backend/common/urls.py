from django.urls import path

from .views import MarkNotificationReadView, NotificationListView

urlpatterns = [
    path("", NotificationListView.as_view(), name="notifications-list"),
    path("<int:pk>/read/", MarkNotificationReadView.as_view(), name="notifications-mark-read"),
]
