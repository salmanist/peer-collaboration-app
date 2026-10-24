from django.conf import settings
from google import genai

_client = None


def get_client():
    """Gemini client - used only for writing answers; document search runs on a local Ollama model."""
    global _client
    if _client is None:
        _client = genai.Client(api_key=settings.GEMINI_API_KEY)
    return _client
