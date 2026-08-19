from django.urls import path

from .views import (
    IncomingItemClaimsListView,
    ItemClaimChatMessageListView,
    ItemClaimListCreateView,
    ItemClaimStatusUpdateView,
    LostAndFoundItemDetailView,
    LostAndFoundItemListCreateView,
    LostAndFoundItemStatusUpdateView,
    LostAndFoundNotificationSummaryView,
    MyItemClaimsListView,
    MyLostAndFoundItemListView,
)

urlpatterns = [
    path("", LostAndFoundItemListCreateView.as_view(), name="lost_and_found_list_create"),
    path("mine/", MyLostAndFoundItemListView.as_view(), name="my_lost_and_found_list"),
    path("summary/", LostAndFoundNotificationSummaryView.as_view(), name="lost_and_found_summary"),
    path("<int:pk>/", LostAndFoundItemDetailView.as_view(), name="lost_and_found_detail"),
    path("<int:pk>/status/", LostAndFoundItemStatusUpdateView.as_view(), name="lost_and_found_status_update"),
    path("<int:item_id>/claims/", ItemClaimListCreateView.as_view(), name="item_claim_list_create"),
    path("claims/mine/", MyItemClaimsListView.as_view(), name="my_item_claims_list"),
    path("claims/incoming/", IncomingItemClaimsListView.as_view(), name="incoming_item_claims_list"),
    path("claims/<int:pk>/status/", ItemClaimStatusUpdateView.as_view(), name="item_claim_status_update"),
    path("claims/<int:claim_id>/messages/", ItemClaimChatMessageListView.as_view(), name="item_claim_chat_messages"),
]
