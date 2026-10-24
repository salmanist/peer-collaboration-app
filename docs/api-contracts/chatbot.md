# API Contract — Document Chatbot

Base path: `/api/chatbot/`. Auth: JWT bearer token. Swagger at `/api/docs/` is authoritative.

## POST `chatbot/ask/`

Body: `{ "question": "What happens if CGPA falls below 2.00?" }` (1–500 characters).

Answers only from the active uploaded documents. Every question is logged (`ChatbotQuery`).

```json
{
  "answer": "Enrollment is suspended ... (page 65)",
  "was_answered": true,
  "sources": [{ "document": "Student Handbook", "page": 65, "similarity": 0.7954 }]
}
```

If no passage reaches `CHATBOT_MIN_SIMILARITY` (0.62) or the model finds no answer: `was_answered: false`, `answer: "I could not find that in the documents."`, `sources: []`.

Errors: `400` bad question, `401` no token, `429` more than 10 questions/minute per user, `503` Gemini unavailable or out of quota.
