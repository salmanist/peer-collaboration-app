from django.core.management.base import BaseCommand, CommandError
from django.db import connection, transaction

from apps.chatbot.embeddings import BATCH_SIZE, EmbeddingError, document_text, embed_texts
from apps.chatbot.models import Chunk


class Command(BaseCommand):
    help = "Re-embed every stored piece with the current local model (run after switching embedding models)."

    def handle(self, *args, **options):
        chunks = list(Chunk.objects.select_related("document").order_by("id"))
        vectors = []
        try:
            for start in range(0, len(chunks), BATCH_SIZE):
                batch = chunks[start:start + BATCH_SIZE]
                vectors += embed_texts([document_text(chunk.text, chunk.document.title) for chunk in batch])
                self.stdout.write(f"Embedded {len(vectors)}/{len(chunks)}")
        except EmbeddingError as exc:
            raise CommandError(f"Embedding failed; nothing was changed. {exc}")
        for chunk, vector in zip(chunks, vectors):
            chunk.embedding = vector
        connection.close()  # Neon drops idle connections during the long embedding step; reconnect to save
        with transaction.atomic():
            Chunk.objects.bulk_update(chunks, ["embedding"], batch_size=100)
        self.stdout.write(self.style.SUCCESS(f"Re-embedded {len(chunks)} pieces."))
