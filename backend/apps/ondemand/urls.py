from django.urls import path

from .views import (
    CurrentRideView,
    DriverApplyView,
    DriverStatusView,
    DriverStopView,
    FareQuoteView,
    MyRideProfileView,
    NearbyRequestsView,
    PlaceListView,
    RideAcceptView,
    RideArrivedView,
    RideCancelView,
    RideCompleteView,
    RideCreateView,
    RideRetryView,
    RideDetailView,
    RideStartView,
)

urlpatterns = [
    path("places/", PlaceListView.as_view(), name="ondemand-places"),
    path("fare/", FareQuoteView.as_view(), name="ondemand-fare"),
    path("profile/", MyRideProfileView.as_view(), name="ondemand-profile"),
    path("profile/apply/", DriverApplyView.as_view(), name="ondemand-profile-apply"),
    path("profile/stop-driving/", DriverStopView.as_view(), name="ondemand-profile-stop"),
    path("driver/status/", DriverStatusView.as_view(), name="ondemand-driver-status"),
    path("driver/requests/", NearbyRequestsView.as_view(), name="ondemand-driver-requests"),
    path("rides/", RideCreateView.as_view(), name="ondemand-ride-create"),
    path("rides/current/", CurrentRideView.as_view(), name="ondemand-ride-current"),
    path("rides/<int:pk>/", RideDetailView.as_view(), name="ondemand-ride-detail"),
    path("rides/<int:pk>/accept/", RideAcceptView.as_view(), name="ondemand-ride-accept"),
    path("rides/<int:pk>/arrived/", RideArrivedView.as_view(), name="ondemand-ride-arrived"),
    path("rides/<int:pk>/start/", RideStartView.as_view(), name="ondemand-ride-start"),
    path("rides/<int:pk>/complete/", RideCompleteView.as_view(), name="ondemand-ride-complete"),
    path("rides/<int:pk>/retry/", RideRetryView.as_view(), name="ondemand-ride-retry"),
    path("rides/<int:pk>/cancel/", RideCancelView.as_view(), name="ondemand-ride-cancel"),
]
