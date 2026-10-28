from .views import RideHistoryView
from django.urls import path

from .views import (
    ActiveTripView,
    LocationListView,
    MyRidesView,
    RideCancelView,
    RideChatMessageListView,
    RideCompleteView,
    RideDetailView,
    RideJoinRequestAcceptView,
    RideJoinRequestDeclineView,
    RideJoinRequestListView,
    RideJoinView,
    RideListCreateView,
    RideStartView,
)

urlpatterns = [
    path("active/", ActiveTripView.as_view(), name="rides-active"),
    path("history/", RideHistoryView.as_view(), name="rides-history"),
    path("locations/", LocationListView.as_view(), name="rides-locations"),
    path("", RideListCreateView.as_view(), name="rides-list"),
    path("mine/", MyRidesView.as_view(), name="rides-mine"),
    path("<int:pk>/", RideDetailView.as_view(), name="rides-detail"),
    path("<int:pk>/join/", RideJoinView.as_view(), name="rides-join"),
    path("<int:pk>/cancel/", RideCancelView.as_view(), name="rides-cancel"),
    path("<int:pk>/start/", RideStartView.as_view(), name="rides-start"),
    path("<int:pk>/complete/", RideCompleteView.as_view(), name="rides-complete"),
    path("<int:pk>/requests/", RideJoinRequestListView.as_view(), name="rides-requests"),
    path("requests/<int:pk>/messages/", RideChatMessageListView.as_view(), name="rides-chat-messages"),
    path("requests/<int:pk>/accept/", RideJoinRequestAcceptView.as_view(), name="rides-request-accept"),
    path("requests/<int:pk>/decline/", RideJoinRequestDeclineView.as_view(), name="rides-request-decline"),
]
