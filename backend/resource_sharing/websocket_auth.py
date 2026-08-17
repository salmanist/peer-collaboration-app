from urllib.parse import parse_qs

from channels.db import database_sync_to_async
from django.contrib.auth.models import AnonymousUser
from rest_framework_simplejwt.authentication import JWTAuthentication


@database_sync_to_async
def get_user_from_access_token(raw_token):
    try:
        authentication = JWTAuthentication()
        validated_token = authentication.get_validated_token(raw_token)
        return authentication.get_user(validated_token)
    except Exception:
        return AnonymousUser()


class JwtQueryStringAuthMiddleware:
    """Authenticates Expo WebSocket connections with the existing JWT access token."""

    def __init__(self, app):
        self.app = app

    async def __call__(self, scope, receive, send):
        query = parse_qs(scope["query_string"].decode())
        raw_token = query.get("token", [""])[0]
        scope["user"] = await get_user_from_access_token(raw_token)
        return await self.app(scope, receive, send)
