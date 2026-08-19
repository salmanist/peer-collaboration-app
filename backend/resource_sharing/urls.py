from django.urls import path

from .views import (
    IncomingResourceInterestRequestListView,
    IncomingPublicResourceOfferListView,
    MyResourceInterestRequestListView,
    MyResourceListingListView,
    MyPublicResourceRequestListView,
    MyPublicResourceOfferListView,
    PublicResourceOfferCreateView,
    PublicResourceOfferChatMessageListView,
    PublicResourceOfferStatusUpdateView,
    PublicResourceRequestDetailView,
    PublicResourceRequestListCreateView,
    PublicResourceRequestStatusUpdateView,
    ResourceInterestRequestCreateView,
    ResourceInterestRequestStatusUpdateView,
    ResourceChatMessageListView,
    ResourceListingDetailView,
    ResourceListingListCreateView,
    ResourceListingStatusUpdateView,
    ResourceNotificationSummaryView,
)

urlpatterns = [
    path("", ResourceListingListCreateView.as_view(), name="resource-list-create"),
    path("summary/", ResourceNotificationSummaryView.as_view(), name="resource-summary"),
    path("mine/", MyResourceListingListView.as_view(), name="my-resource-listings"),
    path("wanted/", PublicResourceRequestListCreateView.as_view(), name="public-resource-request-list-create"),
    path("wanted/mine/", MyPublicResourceRequestListView.as_view(), name="my-public-resource-requests"),
    path("wanted/offers/incoming/", IncomingPublicResourceOfferListView.as_view(), name="incoming-public-resource-offers"),
    path("wanted/offers/mine/", MyPublicResourceOfferListView.as_view(), name="my-public-resource-offers"),
    path("wanted/offers/<int:pk>/status/", PublicResourceOfferStatusUpdateView.as_view(), name="public-resource-offer-status-update"),
    path("wanted/offers/<int:offer_id>/messages/", PublicResourceOfferChatMessageListView.as_view(), name="public-resource-offer-chat-message-list"),
    path("wanted/<int:public_request_id>/offers/", PublicResourceOfferCreateView.as_view(), name="public-resource-offer-create"),
    path("wanted/<int:pk>/status/", PublicResourceRequestStatusUpdateView.as_view(), name="public-resource-request-status-update"),
    path("wanted/<int:pk>/", PublicResourceRequestDetailView.as_view(), name="public-resource-request-detail"),
    path(
        "requests/incoming/",
        IncomingResourceInterestRequestListView.as_view(),
        name="incoming-resource-requests",
    ),
    path(
        "requests/mine/",
        MyResourceInterestRequestListView.as_view(),
        name="my-resource-requests",
    ),
    path(
        "requests/<int:pk>/status/",
        ResourceInterestRequestStatusUpdateView.as_view(),
        name="resource-request-status-update",
    ),
    path(
        "requests/<int:request_id>/messages/",
        ResourceChatMessageListView.as_view(),
        name="resource-chat-message-list",
    ),
    path(
        "<int:resource_id>/requests/",
        ResourceInterestRequestCreateView.as_view(),
        name="resource-request-create",
    ),
    path(
        "<int:pk>/status/",
        ResourceListingStatusUpdateView.as_view(),
        name="resource-status-update",
    ),
    path("<int:pk>/", ResourceListingDetailView.as_view(), name="resource-detail"),
]


