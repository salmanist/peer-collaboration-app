from django.urls import path

from .views import (
    MyRidesView,
    RideCancelView,
    RideDetailView,
    RideJoinRequestAcceptView,
    RideJoinRequestDeclineView,
    RideJoinRequestListView,
    RideJoinView,
    RideListCreateView,
)

urlpatterns = [
    path("", RideListCreateView.as_view(), name="rides-list"),
    path("mine/", MyRidesView.as_view(), name="rides-mine"),
    path("<int:pk>/", RideDetailView.as_view(), name="rides-detail"),
    path("<int:pk>/join/", RideJoinView.as_view(), name="rides-join"),
    path("<int:pk>/cancel/", RideCancelView.as_view(), name="rides-cancel"),
    path("<int:pk>/requests/", RideJoinRequestListView.as_view(), name="rides-requests"),
    path("requests/<int:pk>/accept/", RideJoinRequestAcceptView.as_view(), name="rides-request-accept"),
    path("requests/<int:pk>/decline/", RideJoinRequestDeclineView.as_view(), name="rides-request-decline"),
]
