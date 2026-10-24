import math
import re
from pathlib import Path

from django.contrib.auth import get_user_model
from django.core.management.base import BaseCommand, CommandError
from django.db import connection, transaction
from pypdf import PdfReader

from apps.chatbot.embeddings import BATCH_SIZE, EmbeddingError, document_text, embed_texts
from apps.chatbot.models import Chunk, Document

CHUNK_WORDS = 200  # target 150-250
STEP_WORDS = 170  # 30-word overlap
MIN_TAIL_WORDS = 50  # a shorter leftover gets merged into the last chunk


def read_pages(path):
    """Returns ([(page_number, text)], [pages with no text])."""
    pages, empty_pages = [], []
    for number, page in enumerate(PdfReader(path).pages, start=1):
        text = (page.extract_text() or "").strip()
        if text:
            pages.append((number, text))
        else:
            empty_pages.append(number)
    return pages, empty_pages


def cut_chunks(pages):
    """Sliding word window; each chunk keeps the page its first word is on."""
    words = [(word, number) for number, text in pages for word in re.split(r"\s+", text) if word]
    chunks, start = [], 0
    while start < len(words):
        end = start + CHUNK_WORDS
        if len(words) - end < MIN_TAIL_WORDS:
            end = len(words)
        chunks.append((words[start][1], " ".join(word for word, _ in words[start:end])))
        if end == len(words):
            break
        start += STEP_WORDS
    return chunks


class Command(BaseCommand):
    help = "Read a PDF, cut it into pieces, embed them with the local Ollama model and store them."

    def add_arguments(self, parser):
        parser.add_argument("pdf_path")
        parser.add_argument("--title", required=True)
        parser.add_argument("--replace", action="store_true")
        parser.add_argument("--dry-run", action="store_true")
        parser.add_argument("--admin-email")

    def handle(self, *args, pdf_path, title, replace, dry_run, admin_email, **options):
        path = Path(pdf_path)
        if not path.is_file():
            raise CommandError(f"File not found: {path}")

        pages, empty_pages = read_pages(path)
        chunks = cut_chunks(pages)
        requests_needed = math.ceil(len(chunks) / BATCH_SIZE)
        self.stdout.write(
            f"Pages: {len(pages) + len(empty_pages)} | pages with no text (skipped): {empty_pages or 'none'} | "
            f"pieces: {len(chunks)} | embedding requests: {requests_needed}"
        )
        if not chunks:
            raise CommandError("No readable text found in this PDF.")
        if dry_run:
            self.stdout.write("Dry run: nothing embedded, nothing saved.")
            return

        uploader = None
        if admin_email:
            uploader = get_user_model().objects.filter(email__iexact=admin_email).first()
            if uploader is None:
                raise CommandError(f"No user with email {admin_email}")

        existing = Document.objects.filter(title=title)
        if existing.exists() and not replace:
            raise CommandError(f'A document titled "{title}" already exists. Re-run with --replace to swap it.')

        # Embed everything first so a failure leaves the database untouched.
        vectors = []
        try:
            for start in range(0, len(chunks), BATCH_SIZE):
                batch = chunks[start:start + BATCH_SIZE]
                vectors += embed_texts([document_text(text, title) for _, text in batch])
                self.stdout.write(f"Embedded {len(vectors)}/{len(chunks)}")
        except EmbeddingError as exc:
            raise CommandError(f"Embedding failed; nothing was saved. {exc}")

        connection.close()  # Neon drops idle connections during the long embedding step; reconnect to save
        with transaction.atomic():
            Document.objects.filter(title=title).delete()
            document = Document.objects.create(title=title, original_filename=path.name, uploaded_by=uploader)
            Chunk.objects.bulk_create(
                Chunk(document=document, page_number=page, chunk_index=index, text=text, embedding=vector)
                for index, ((page, text), vector) in enumerate(zip(chunks, vectors))
            )
        self.stdout.write(self.style.SUCCESS(f'Loaded "{title}": {len(chunks)} pieces.'))
