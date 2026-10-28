from channels.db import database_sync_to_async
from channels.generic.websocket import AsyncJsonWebsocketConsumer

from .chat import CLOSED_MESSAGE, chat_group, has_chat, is_closed, is_participant
from .models import RideChatMessage, RideJoinRequest


class RideChatConsumer(AsyncJsonWebsocketConsumer):
    async def connect(self):
        self.request_id = self.scope["url_route"]["kwargs"]["request_id"]
        user = self.scope["user"]
        if not user.is_authenticated or not await self.can_access_chat(user.id):
            await self.close(code=4403)
            return
        self.group_name = chat_group(self.request_id)
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
        if "error" in result:
            await self.send_json({"type": "error", "detail": result["error"]})
            return
        await self.channel_layer.group_send(self.group_name, {"type": "chat.message", "message": result})

    async def chat_message(self, event):
        await self.send_json({"type": "message", "message": event["message"]})

    async def chat_closed(self, event):
        await self.send_json({"type": "closed", "detail": CLOSED_MESSAGE})

    @database_sync_to_async
    def can_access_chat(self, user_id):
        join_request = RideJoinRequest.objects.select_related("ride").filter(pk=self.request_id).first()
        return bool(join_request and has_chat(join_request) and is_participant(join_request, user_id))

    @database_sync_to_async
    def save_message(self, user_id, body):
        join_request = RideJoinRequest.objects.select_related("ride", "requester", "ride__offerer").filter(pk=self.request_id).first()
        if join_request is None or not has_chat(join_request) or not is_participant(join_request, user_id):
            return {"error": "This chat is not accessible."}
        if is_closed(join_request):
            return {"error": CLOSED_MESSAGE}
        message = RideChatMessage.objects.create(join_request=join_request, sender_id=user_id, body=body)
        sender = join_request.requester if join_request.requester_id == user_id else join_request.ride.offerer
        return {
            "id": message.id,
            "request": join_request.id,
            "sender_id": user_id,
            "sender_name": sender.display_name,
            "body": message.body,
            "image": None,
            "created_at": message.created_at.isoformat(),
        }
