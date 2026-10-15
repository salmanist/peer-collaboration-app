from channels.db import database_sync_to_async
from channels.generic.websocket import AsyncJsonWebsocketConsumer

from .models import ItemClaim, ItemClaimChatMessage


class ItemClaimChatConsumer(AsyncJsonWebsocketConsumer):
    async def connect(self):
        self.claim_id = self.scope["url_route"]["kwargs"]["claim_id"]
        user = self.scope["user"]

        if not user.is_authenticated or not await self.can_access_chat(user.id):
            await self.close(code=4403)
            return

        self.group_name = f"claim_chat_{self.claim_id}"
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
        claim = (
            ItemClaim.objects.select_related("item", "item__poster")
            .filter(pk=self.claim_id)
            .first()
        )
        if claim is None:
            return False
        participants = {claim.claimant_id, claim.item.poster_id}
        return user_id in participants and claim.status == ItemClaim.Status.ACCEPTED

    @database_sync_to_async
    def save_message(self, user_id, body):
        claim = (
            ItemClaim.objects.select_related("item", "item__poster", "claimant")
            .filter(pk=self.claim_id)
            .first()
        )
        if claim is None or claim.status != ItemClaim.Status.ACCEPTED:
            return None
        if user_id not in {claim.claimant_id, claim.item.poster_id}:
            return None

        message = ItemClaimChatMessage.objects.create(
            claim=claim,
            sender_id=user_id,
            body=body,
        )
        return {
            "id": message.id,
            "claim": claim.id,
            "sender_id": message.sender_id,
            "sender_name": message.sender.full_name,
            "body": message.body,
            "image": None,
            "created_at": message.created_at.isoformat(),
        }
