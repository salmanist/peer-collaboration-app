"""ASGI entry: HTTP via Django, WebSocket chat via Channels (JWT in ?token=)."""

import os

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings.dev")

from channels.routing import ProtocolTypeRouter, URLRouter
from django.core.asgi import get_asgi_application

django_asgi_application = get_asgi_application()

from apps.resource_sharing.websocket_auth import JwtQueryStringAuthMiddleware
from config.routing import websocket_urlpatterns

application = ProtocolTypeRouter(
    {
        "http": django_asgi_application,
        "websocket": JwtQueryStringAuthMiddleware(URLRouter(websocket_urlpatterns)),
    }
)
