from channels.db import database_sync_to_async
from channels.generic.websocket import AsyncJsonWebsocketConsumer

from .models import PublicResourceOffer, PublicResourceOfferChatMessage, ResourceChatMessage, ResourceInterestRequest


class ResourceChatConsumer(AsyncJsonWebsocketConsumer):
    async def connect(self):
        self.request_id = self.scope["url_route"]["kwargs"]["request_id"]
        user = self.scope["user"]

        if not user.is_authenticated or not await self.can_access_chat(user.id):
            await self.close(code=4403)
            return

        self.group_name = f"resource_chat_{self.request_id}"
        await self.channel_layer.group_add(self.group_name, self.channel_name)
        await self.accept()

    async def disconnect(self, close_code):
        if hasattr(self, "group_name"):
            await self.channel_layer.group_discard(self.group_name, self.channel_name)

    async def receive_json(self, content, **kwargs):
        body = str(content.get("body", "")).strip()
        if not body or len(body) > 1500:
            await self.send_json({"type": "error", "detail": "Messages must contain 1 to 1500 characters."})
            return

        message = await self.save_message(self.scope["user"].id, body)
        if message is None:
            await self.send_json({"type": "error", "detail": "This chat is no longer available."})
            return

        await self.channel_layer.group_send(
            self.group_name,
            {"type": "chat.message", "message": message},
        )

    async def chat_message(self, event):
        await self.send_json({"type": "message", "message": event["message"]})

    @database_sync_to_async
    def can_access_chat(self, user_id):
        interest_request = ResourceInterestRequest.objects.select_related("resource").filter(pk=self.request_id).first()
        if interest_request is None:
            return False
        participants = {interest_request.requester_id, interest_request.resource.owner_id}
        return (
            user_id in participants
            and interest_request.status in {
                ResourceInterestRequest.Status.ACCEPTED,
                ResourceInterestRequest.Status.COMPLETED,
            }
        )

    @database_sync_to_async
    def save_message(self, user_id, body):
        interest_request = ResourceInterestRequest.objects.select_related("resource").filter(pk=self.request_id).first()
        if interest_request is None or interest_request.status != ResourceInterestRequest.Status.ACCEPTED:
            return None
        if user_id not in {interest_request.requester_id, interest_request.resource.owner_id}:
            return None

        message = ResourceChatMessage.objects.create(
            interest_request=interest_request,
            sender_id=user_id,
            body=body,
        )
        return {
            "id": message.id,
            "interest_request": interest_request.id,
            "sender_id": message.sender_id,
            "sender_name": message.sender.full_name,
            "body": message.body,
            "image": None,
            "created_at": message.created_at.isoformat(),
        }


class PublicResourceOfferChatConsumer(AsyncJsonWebsocketConsumer):
    async def connect(self):
        self.offer_id = self.scope["url_route"]["kwargs"]["offer_id"]
        user = self.scope["user"]

        if not user.is_authenticated or not await self.can_access_chat(user.id):
            await self.close(code=4403)
            return

        self.group_name = f"public_offer_chat_{self.offer_id}"
        await self.channel_layer.group_add(self.group_name, self.channel_name)
        await self.accept()

    async def disconnect(self, close_code):
        if hasattr(self, "group_name"):
            await self.channel_layer.group_discard(self.group_name, self.channel_name)

    async def receive_json(self, content, **kwargs):
        body = str(content.get("body", "")).strip()
        if not body or len(body) > 1500:
            await self.send_json({"type": "error", "detail": "Messages must contain 1 to 1500 characters."})
            return

        message = await self.save_message(self.scope["user"].id, body)
        if message is None:
            await self.send_json({"type": "error", "detail": "This chat is no longer available."})
            return

        await self.channel_layer.group_send(self.group_name, {"type": "chat.message", "message": message})

    async def chat_message(self, event):
        await self.send_json({"type": "message", "message": event["message"]})

    @database_sync_to_async
    def can_access_chat(self, user_id):
        offer = PublicResourceOffer.objects.select_related("public_request").filter(pk=self.offer_id).first()
        if offer is None:
            return False
        return (
            user_id in {offer.offerer_id, offer.public_request.requester_id}
            and offer.status == PublicResourceOffer.Status.ACCEPTED
        )

    @database_sync_to_async
    def save_message(self, user_id, body):
        offer = PublicResourceOffer.objects.select_related("public_request").filter(pk=self.offer_id).first()
        if offer is None or offer.status != PublicResourceOffer.Status.ACCEPTED:
            return None
        if user_id not in {offer.offerer_id, offer.public_request.requester_id}:
            return None

        message = PublicResourceOfferChatMessage.objects.create(
            public_offer=offer,
            sender_id=user_id,
            body=body,
        )
        return {
            "id": message.id,
            "public_offer": offer.id,
            "sender_id": message.sender_id,
            "sender_name": message.sender.full_name,
            "body": message.body,
            "image": None,
            "created_at": message.created_at.isoformat(),
        }

