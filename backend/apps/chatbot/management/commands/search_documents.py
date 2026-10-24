import sys

from django.core.management.base import BaseCommand

from apps.chatbot.services import search_chunks


def printable(text):
    # Windows consoles can't show every PDF character; replace instead of crashing.
    encoding = sys.stdout.encoding or "utf-8"
    return text.encode(encoding, "replace").decode(encoding)


class Command(BaseCommand):
    help = "Find the closest document pieces to a question (no answer is written)."

    def add_arguments(self, parser):
        parser.add_argument("question")

    def handle(self, *args, question, **options):
        closest = search_chunks(question)
        self.stdout.write(f"Question: {question}")
        for rank, chunk in enumerate(closest, start=1):
            # Similarity = 1 - cosine distance (1.0 is identical).
            self.stdout.write(
                f"{rank}. [{chunk.document.title}] page {chunk.page_number} | similarity {1 - chunk.distance:.4f}\n"
                f"   {printable(chunk.text[:200])}"
            )
