# TEMPORARY: delete after confirming 768-number embeddings work.
import os
from pathlib import Path
from dotenv import load_dotenv
from google import genai
from google.genai import types

load_dotenv(Path(__file__).resolve().parent.parent / ".env")
client = genai.Client(api_key=os.environ["GEMINI_API_KEY"])
res = client.models.embed_content(
    model="gemini-embedding-2",
    contents="Students share rides to campus.",
    config=types.EmbedContentConfig(output_dimensionality=768),
)
n = len(res.embeddings[0].values)
print("numbers:", n)
assert n == 768
