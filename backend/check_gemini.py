# TEMPORARY: delete after confirming Gemini works.
import os, sys
from pathlib import Path
from dotenv import load_dotenv
from google import genai

load_dotenv(Path(__file__).resolve().parent.parent / ".env")
client = genai.Client(api_key=os.environ["GEMINI_API_KEY"])

def first_working(models, call):
    for name in models:
        try:
            return name, call(name)
        except Exception as e:
            print(f"  {name} failed: {type(e).__name__}: {str(e)[:160].replace(os.environ['GEMINI_API_KEY'], '***')}")
    sys.exit("no model worked")

name, res = first_working(["gemini-embedding-2", "gemini-embedding-001"],
    lambda m: client.models.embed_content(model=m, contents="Students share rides to campus."))
print("embedding model:", name, "| numbers:", len(res.embeddings[0].values))

name, res = first_working(["gemini-3.5-flash-lite", "gemini-3.1-flash-lite", "gemini-3.6-flash"],
    lambda m: client.models.generate_content(model=m, contents="In one short sentence, what is a university?"))
print("text model:", name, "| reply:", res.text.strip())
