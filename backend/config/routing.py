from django.urls import path

from resource_sharing.consumers import PublicResourceOfferChatConsumer, ResourceChatConsumer

websocket_urlpatterns = [
    path("ws/resources/requests/<int:request_id>/chat/", ResourceChatConsumer.as_asgi()),
    path("ws/resources/offers/<int:offer_id>/chat/", PublicResourceOfferChatConsumer.as_asgi()),
]
