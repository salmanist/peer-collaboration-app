import json
import urllib.error
import urllib.request

from django.conf import settings

BATCH_SIZE = 16  # pieces per Ollama request
MIN_TEXT_CHARS = 200  # stop shortening an over-long piece below this


class EmbeddingError(Exception):
    """The local embedding model (Ollama) could not be reached or refused the text."""


# nomic-embed-text expects these task prefixes.
def document_text(body, title):
    return f"search_document: {title}\n{body}"


def query_text(question):
    return f"search_query: {question}"


def _post(texts):
    request = urllib.request.Request(
        f"{settings.OLLAMA_URL}/api/embed",
        data=json.dumps({"model": settings.EMBEDDING_MODEL, "input": texts}).encode(),
        headers={"Content-Type": "application/json"},
    )
    with urllib.request.urlopen(request, timeout=300) as response:
        return json.load(response)["embeddings"]


def embed_texts(texts):
    """Returns one vector per text. A piece too long for the model is shortened and retried."""
    try:
        return _post(texts)
    except urllib.error.HTTPError as exc:
        if exc.code != 400:
            raise EmbeddingError(f"Ollama returned HTTP {exc.code}") from exc
    except (urllib.error.URLError, TimeoutError) as exc:
        raise EmbeddingError(f"Could not reach Ollama at {settings.OLLAMA_URL}. Is it running?") from exc
    # ponytail: a 400 means some piece exceeds the model's context (e.g. dotted contents pages); retry one by one, shortening.
    vectors = []
    for text in texts:
        while True:
            try:
                vectors.append(_post([text])[0])
                break
            except urllib.error.HTTPError as exc:
                if exc.code != 400 or len(text) <= MIN_TEXT_CHARS:
                    raise EmbeddingError("Ollama rejected a piece of text.") from exc
                text = text[: int(len(text) * 0.7)]
            except (urllib.error.URLError, TimeoutError) as exc:
                raise EmbeddingError(f"Could not reach Ollama at {settings.OLLAMA_URL}.") from exc
    return vectors
