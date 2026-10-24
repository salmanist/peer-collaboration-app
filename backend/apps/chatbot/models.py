from django.conf import settings
from django.db import models
from pgvector.django import VectorField


class Document(models.Model):
    title = models.CharField(max_length=255)
    original_filename = models.CharField(max_length=255)
    uploaded_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True, related_name="chatbot_documents"
    )
    uploaded_at = models.DateTimeField(auto_now_add=True)
    # Inactive documents are skipped when answering questions.
    is_active = models.BooleanField(default=True)

    def __str__(self):
        return self.title


class Chunk(models.Model):
    document = models.ForeignKey(Document, on_delete=models.CASCADE, related_name="chunks")
    page_number = models.PositiveIntegerField()
    chunk_index = models.PositiveIntegerField()
    text = models.TextField()
    # No vector index on purpose - the corpus is small, a sequential scan is fine.
    embedding = VectorField(dimensions=settings.EMBEDDING_DIMENSIONS)

    class Meta:
        ordering = ["document", "chunk_index"]

    def __str__(self):
        return f"{self.document_id} #{self.chunk_index} (p.{self.page_number})"


class ChatbotQuery(models.Model):
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="chatbot_queries")
    question = models.TextField()
    answer = models.TextField(blank=True, default="")
    was_answered = models.BooleanField(default=False)  # False = bot said it didn't know
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return self.question[:60]
