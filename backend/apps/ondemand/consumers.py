from channels.db import database_sync_to_async
from channels.generic.websocket import AsyncJsonWebsocketConsumer
from .models import PeerRideChatMessage, PeerRideRequest


class PeerRideChatConsumer(AsyncJsonWebsocketConsumer):
    async def connect(self):
        self.request_id = self.scope["url_route"]["kwargs"]["request_id"]
        user = self.scope["user"]

        if not user.is_authenticated or not await self.can_access_chat(user.id):
            await self.close(code=4403)
            return

        self.group_name = f"peer_ride_chat_{self.request_id}"
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

        result = await self.save_message(self.scope["user"].id, body)
        if result is None or "error" in result:
            err_msg = result.get("error") if (result and "error" in result) else "This chat is not accessible."
            await self.send_json({"type": "error", "detail": err_msg})
            return

        await self.channel_layer.group_send(
            self.group_name,
            {"type": "chat.message", "message": result},
        )

    async def chat_message(self, event):
        await self.send_json({"type": "message", "message": event["message"]})

    @database_sync_to_async
    def can_access_chat(self, user_id):
        req = PeerRideRequest.objects.filter(pk=self.request_id).first()
        if req is None:
            return False
        return user_id in {req.poster_id, req.responder_id}

    @database_sync_to_async
    def save_message(self, user_id, body):
        req = PeerRideRequest.objects.select_related("poster", "responder").filter(pk=self.request_id).first()
        if req is None:
            return {"error": "Ride request not found."}
        if user_id not in {req.poster_id, req.responder_id}:
            return {"error": "You are not a participant in this ride."}

        msg = PeerRideChatMessage.objects.create(
            request=req,
            sender_id=user_id,
            body=body,
        )
        sender = req.poster if req.poster_id == user_id else req.responder
        sender_name = sender.display_name if sender else "Student"

        return {
            "id": msg.id,
            "request": req.id,
            "sender_id": user_id,
            "sender_name": sender_name,
            "body": msg.body,
            "image": None,
            "created_at": msg.created_at.isoformat(),
        }
