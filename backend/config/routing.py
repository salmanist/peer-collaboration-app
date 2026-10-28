from django.urls import path

from apps.lost_and_found.consumers import ItemClaimChatConsumer
from apps.ondemand.consumers import PeerRideChatConsumer
from apps.peer_tutoring.consumers import TutoringSessionChatConsumer
from apps.rides.consumers import RideChatConsumer
from apps.resource_sharing.consumers import PublicResourceOfferChatConsumer, ResourceChatConsumer

websocket_urlpatterns = [
    path("ws/resources/requests/<int:request_id>/chat/", ResourceChatConsumer.as_asgi()),
    path("ws/resources/offers/<int:offer_id>/chat/", PublicResourceOfferChatConsumer.as_asgi()),
    path("ws/lost-and-found/claims/<int:claim_id>/chat/", ItemClaimChatConsumer.as_asgi()),
    path("ws/tutoring/sessions/<int:session_id>/chat/", TutoringSessionChatConsumer.as_asgi()),
    path("ws/ondemand/peer-requests/<int:request_id>/chat/", PeerRideChatConsumer.as_asgi()),
    path("ws/rides/requests/<int:request_id>/chat/", RideChatConsumer.as_asgi()),
]
