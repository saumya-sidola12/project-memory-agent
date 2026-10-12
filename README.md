# AI Project Memory Assistant

AI Project Memory Assistant is a web app that turns messy AI/dev conversations into a **searchable project memory**. You paste a conversation (a chat with an AI assistant, a Slack thread, meeting notes — anything), the app's AI extracts the durable facts — decisions, reasons, problems, solutions, constraints — stores them as structured "memories", and later answers questions about the project using those memories instead of making things up.

## What you can do with it

- **Projects** — group memories per project (e.g. "Checkout rewrite", "Mobile app"). Each project can link a GitHub repo.
- **Add a conversation** — paste any conversation text and click ingest. The AI reads it and saves the things worth remembering, each tagged by type (decision / reason / problem / solution / constraint) with the source excerpt it came from.
- **Ask questions** — ask "Why did we choose server-side rendering?" and get an answer grounded in the memories you actually saved, with links back to the memories used.
- **GitHub tab** — see the recent commit history of the project's linked public repository next to your memories.

## How it works

### 1. Ingestion — conversation → memories

When you submit a conversation:

1. The text is sent to a server function (`ingestConversation`) — the AI key never touches the browser.
2. An LLM call extracts structured memories: a type, a short title, the content, why it matters (`reason`), tags, and the exact source excerpt from the conversation.
3. Each memory is converted to an **embedding** (a numeric vector that captures its meaning) and stored in the database.

### 2. Question answering — retrieval-augmented generation (RAG)

When you ask a question:

1. The question is embedded with the same model.
2. The database finds the memories whose vectors are **semantically closest** to the question (pgvector cosine similarity via the `match_memories` SQL function) — so "why did we pick Postgres?" matches a memory titled "Database choice" even with no shared words.
3. The top matches are given to the LLM as context, and it answers **only from that context** — so answers reflect what the project actually decided, not the model's guesses.
4. Memories that were added manually without an embedding are indexed lazily on the next question, so they join the search automatically.

### 3. GitHub commits

The project's linked repo is fetched through the **public GitHub API** (no token), so it works with public repositories. Both full `github.com/owner/repo` URLs and short `owner/repo` inputs are accepted.

## Tech stack

| Layer | Choice |
| --- | --- |
| Frontend | React 19 + TypeScript, TanStack Start (file-based routing, server functions), TanStack Query, Tailwind CSS v4, shadcn/ui |
| Backend logic | TanStack server functions (`src/lib/memory.functions.ts`) — validated with Zod |
| AI | Lovable AI Gateway — chat extraction/answering + embeddings (`src/lib/ai.server.ts`) |
| Database | Lovable Cloud (Postgres + pgvector for similarity search) |

## Project structure

```
src/
├── routes/
│   ├── index.tsx          # Project list (home)
│   └── projects/$id.tsx   # Project detail: memories, add conversation, ask, GitHub
├── lib/
│   ├── ai.server.ts           # All AI calls (extract, embed, answer) — server-only
│   ├── memory.functions.ts    # Server functions the UI calls
│   └── memory-types.ts        # Memory types, colors, data queries
└── integrations/supabase/ # Generated database clients
```

## Running locally

```sh
npm i
npm run dev
```

Environment variables for the database and AI are managed by the Lovable platform (`VITE_SUPABASE_*` for the browser, `SUPABASE_URL` / `SUPABASE_PUBLISHABLE_KEY` inside server functions).

## Current limitations

- **No login** — this is a shared, sign-in-free demo. Everyone who opens the app sees the same projects (tables use open demo policies).
- **GitHub** — only public repositories work, since commits come from the unauthenticated GitHub API.
- **Conversation size** — up to 60,000 characters per ingestion.

## Built with

- [TanStack Start](https://tanstack.com/start)
- [Cloud](Postgres + pgvector)
- [ AI Gateway](gemini,grok)
- Tailwind CSS + shadcn/ui
