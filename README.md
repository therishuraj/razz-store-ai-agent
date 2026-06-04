# Razz's Store AI Agent

A customer support chat app powered by Google Gemini. Users chat with an AI agent that answers questions about the store's shipping, returns, payments, and more. Conversations are persisted and restored on page reload.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Backend | Node.js + TypeScript + Express |
| Database | SQLite (via better-sqlite3) |
| AI | Google Gemini 2.5 Flash |
| Frontend | Svelte + Vite |

---

## Local Development

### Prerequisites

- Node.js v18 or higher
- A Google Gemini API key ([get one free at aistudio.google.com](https://aistudio.google.com/app/apikey))

### 1. Clone and install

```bash
git clone <your-repo-url>
cd razz-store-ai-agent

# Install backend dependencies
npm install

# Install frontend dependencies
cd frontend && npm install && cd ..
```

### 2. Configure environment variables

```bash
cp .env.example .env
```

Open `.env` and fill in your key:

```
GEMINI_API_KEY=your_gemini_api_key_here
PORT=3000
```

### 3. Set up the database

The database is created and seeded automatically on first run — no manual migration needed. SQLite creates a `chat.db` file in the project root.

To reseed (e.g. after changing store knowledge):

```bash
rm chat.db
npm run dev   # will recreate and reseed on startup
```

### 4. Run the backend

```bash
npm run dev
```

Server starts at `http://localhost:3000`

### 5. Run the frontend (separate terminal)

```bash
cd frontend
npm run dev
```

Frontend starts at `http://localhost:5173`

---

## Production Build (single deployment)

In production the Express backend also serves the compiled Svelte frontend — one server, one URL.

```bash
npm run build   # builds frontend + compiles TypeScript
npm start       # starts production server
```

---

## Deploying to Render

1. Push the repo to GitHub
2. Go to [render.com](https://render.com) → New Web Service → connect repo
3. Set:
   - **Build command:** `npm run build`
   - **Start command:** `npm start`
4. Add environment variable: `GEMINI_API_KEY`
5. Deploy — Render gives you a single URL for everything

> **Note:** SQLite on Render's free tier does not persist across deploys. Conversations reset on redeploy. For persistent storage, enable Render's persistent disk or migrate to PostgreSQL.

---

## API Endpoints

### `POST /chat/message`

Send a user message and get an AI reply.

**Request:**
```json
{
  "message": "What is your return policy?",
  "sessionId": "optional-uuid-to-continue-a-conversation"
}
```

**Response:**
```json
{
  "reply": "You can return items within 30 days...",
  "sessionId": "uuid-of-the-conversation"
}
```

### `GET /chat/history/:sessionId`

Fetch all messages for a conversation (used on page reload).

**Response:**
```json
{
  "sessionId": "uuid",
  "createdAt": "2026-06-04 10:00:00",
  "messages": [
    { "sender": "user", "text": "Hi", "timestamp": "2026-06-04 10:00:01" },
    { "sender": "ai",   "text": "Hello! How can I help?", "timestamp": "2026-06-04 10:00:02" }
  ]
}
```

---

## Architecture Overview

```
razz-store-ai-agent/
├── src/
│   ├── index.ts           # Express server, middleware, static file serving
│   ├── routes/
│   │   └── chat.ts        # HTTP layer — validates input, calls service, returns response
│   ├── services/
│   │   ├── chat.ts        # Business logic — conversation management, prompt building, DB writes
│   │   └── llm.ts         # LLM layer — Gemini API call, error handling
│   └── db/
│       ├── database.ts    # SQLite connection + schema creation
│       └── seed.ts        # Store knowledge seeding
└── frontend/
    └── src/
        └── App.svelte     # Entire chat UI in one component
```

### Layer responsibilities

**Routes (`routes/chat.ts`)** — HTTP only. Validates request shape, calls the service, maps results to HTTP responses. No business logic lives here.

**Chat Service (`services/chat.ts`)** — owns the conversation flow. Loads history from DB, builds the system prompt from the knowledge base, calls the LLM service, and persists messages. This is the single entry point for any channel (HTTP today, WhatsApp or Slack tomorrow — they'd call the same `sendMessage()` function).

**LLM Service (`services/llm.ts`)** — knows only about Gemini. Wraps the API call, maps every known error type to a clear user-facing message, and returns a typed `{ success, text }` result so callers know whether to persist the reply.

**Database (`db/`)** — thin layer. Schema is created on startup, seed runs once if the knowledge table is empty. No ORM — raw `better-sqlite3` queries are simple enough for this scale.

### Key design decisions

- **Knowledge in DB, not hardcoded in prompt** — store policies are rows in the `knowledge_base` table, loaded at runtime into the system prompt. Updating store info doesn't require a code change.
- **Error replies never persisted** — when Gemini fails, the error message is shown in the UI but not saved to the DB. On reload, the failed turn is gone and the conversation context stays clean.
- **Session via localStorage** — no auth required. The `sessionId` (UUID) is stored in the browser and sent with each request. The backend creates a new conversation if the ID is missing or invalid.
- **UUID validation** — `sessionId` values are validated against the UUID v4 format before any DB query, preventing garbage input from reaching SQLite.

---

## LLM Notes

**Provider:** Google Gemini 2.5 Flash (free tier via AI Studio)

**Why Gemini:** Free tier available without billing setup, generous enough for development and demos.

**Prompting approach:**

```
System prompt:
  - Role definition: "You are a support agent for Razz's Store"
  - Behavioural rules: answer from knowledge only, suggest email for unknowns, be concise
  - Store knowledge: injected from DB at runtime (returns, shipping, payments, etc.)

Conversation:
  - Full message history passed on every request (Gemini has no memory between calls)
  - History loaded from DB, mapped to Gemini's role format (user / model)
```

**Token cost control:**
- `maxOutputTokens: 500` cap on every response
- Rate limiting: 10 messages/min per IP on the chat endpoint
- Message length capped at 1000 characters on both frontend and backend

---

## Trade-offs & If I Had More Time

### Trade-offs made

| Decision | Trade-off |
|---|---|
| SQLite over PostgreSQL | Zero setup, works out of the box — but doesn't scale to multiple server instances |
| Single `App.svelte` component | Fast to build and easy to read — would need splitting into sub-components at scale |
| No auth | Keeps it simple for a demo — any real deployment needs at least session-based identity |
| Full history on every LLM call | Simple and correct — but gets expensive for very long conversations |

### If I had more time

- **Streaming responses** — stream Gemini's reply token by token so the user sees text appearing in real time instead of waiting for the full response
- **PostgreSQL** — replace SQLite for production-grade persistence and multi-instance support
- **Conversation history trimming** — cap history at last N messages or summarise older turns to control token cost on long conversations
- **Admin panel** — simple UI to edit the `knowledge_base` table without touching the DB directly
- **Auth** — even a simple anonymous session token so conversations are tied to a user across devices
- **Tests** — unit tests for the service layer and integration tests for the API endpoints
- **Retry logic** — auto-retry on Gemini rate limit errors with exponential backoff instead of surfacing the error immediately
