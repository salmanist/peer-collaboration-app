from django.conf import settings
from rest_framework import permissions, status
from rest_framework.response import Response
from rest_framework.throttling import UserRateThrottle
from rest_framework.views import APIView

from .models import ChatbotQuery
from .serializers import AskSerializer
from .services import search_chunks, write_answer

NOT_FOUND_ANSWER = "I could not find that in the documents."


class AskThrottle(UserRateThrottle):
    rate = "10/min"  # protects the free Gemini quota


class AskView(APIView):
    permission_classes = [permissions.IsAuthenticated]
    throttle_classes = [AskThrottle]

    def post(self, request):
        serializer = AskSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        question = serializer.validated_data["question"]

        try:
            chunks = search_chunks(question, settings.CHATBOT_CONTEXT_CHUNKS)
            relevant = [c for c in chunks if c.keyword_hit or 1 - c.distance >= settings.CHATBOT_MIN_SIMILARITY]
            answer = write_answer(question, relevant) if relevant else NOT_FOUND_ANSWER
        except Exception:  # Gemini error, timeout or both models failing
            return Response({"detail": "The assistant is busy. Please try again shortly."}, status=status.HTTP_503_SERVICE_UNAVAILABLE)

        was_answered = bool(relevant) and answer != NOT_FOUND_ANSWER
        ChatbotQuery.objects.create(user=request.user, question=question, answer=answer, was_answered=was_answered)
        sources = [
            {"document": c.document.title, "page": c.page_number, "similarity": round(1 - c.distance, 4)}
            for c in relevant
        ] if was_answered else []
        return Response({"answer": answer, "was_answered": was_answered, "sources": sources})
