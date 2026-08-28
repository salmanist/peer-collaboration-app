from datetime import timedelta
from channels.db import database_sync_to_async
from channels.generic.websocket import AsyncJsonWebsocketConsumer
from django.utils import timezone

from .models import TutoringChatMessage, TutoringSession


class TutoringSessionChatConsumer(AsyncJsonWebsocketConsumer):
    async def connect(self):
        self.session_id = self.scope["url_route"]["kwargs"]["session_id"]
        user = self.scope["user"]

        if not user.is_authenticated or not await self.can_access_chat(user.id):
            await self.close(code=4403)
            return

        self.group_name = f"tutoring_chat_{self.session_id}"
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
            err_msg = result.get("error") if (result and "error" in result) else "This chat is not accessible or session is completed."
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
        session = (
            TutoringSession.objects.filter(pk=self.session_id)
            .first()
        )
        if session is None:
            return False

        # Auto-complete expired sessions
        if session.status == TutoringSession.Status.ACCEPTED:
            now = timezone.now()
            duration = session.duration_minutes or 60
            if now >= session.scheduled_at + timedelta(minutes=duration + 30):
                session.status = TutoringSession.Status.COMPLETED
                session.save(update_fields=["status", "updated_at"])

        is_participant = user_id in {session.tutor_id, session.learner_id}
        is_active_or_completed = session.status in [TutoringSession.Status.ACCEPTED, TutoringSession.Status.COMPLETED]
        return is_participant and is_active_or_completed

    @database_sync_to_async
    def save_message(self, user_id, body):
        session = (
            TutoringSession.objects.select_related("tutor", "learner")
            .filter(pk=self.session_id)
            .first()
        )
        if session is None:
            return None

        # Auto-complete expired sessions
        if session.status == TutoringSession.Status.ACCEPTED:
            now = timezone.now()
            duration = session.duration_minutes or 60
            if now >= session.scheduled_at + timedelta(minutes=duration + 30):
                session.status = TutoringSession.Status.COMPLETED
                session.save(update_fields=["status", "updated_at"])

        if session.status == TutoringSession.Status.COMPLETED:
            return {"error": "This session is completed. Messaging is closed."}

        if session.status != TutoringSession.Status.ACCEPTED:
            return {"error": "Messaging is only available for accepted sessions."}

        if user_id not in {session.tutor_id, session.learner_id}:
            return None

        message = TutoringChatMessage.objects.create(
            session=session,
            sender_id=user_id,
            body=body,
        )
        return {
            "id": message.id,
            "session": session.id,
            "sender_id": message.sender_id,
            "sender_name": message.sender.display_name,
            "body": message.body,
            "image": None,
            "created_at": message.created_at.isoformat(),
        }

