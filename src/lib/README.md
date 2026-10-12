# Shared Logic

This folder contains reusable application logic that is not tied to a specific page. It includes project-memory data queries, server functions, AI operations, general utilities, and error handling.

## Files

| File | Purpose |
| --- | --- |
| `memory-types.ts` | Defines memory categories, their visual styles, and React Query options for loading projects and memories from Supabase. |
| `memory.functions.ts` | Defines validated server functions to ingest conversations, answer questions using project memories, and fetch GitHub commits; also normalizes GitHub repository input. |
| `ai.server.ts` | Server-side AI operations for extracting memories, creating embeddings, and answering questions from retrieved context. Requires `LOVABLE_API_KEY`. |
| `utils.ts` | Exports `cn()`, which combines conditional class names and merges conflicting Tailwind classes. |
| `error-capture.ts` | Captures and formats errors so useful error details survive server-handler error serialization. |
| `error-page.ts` | Renders the plain HTML fallback page used for catastrophic server errors. |
| `lovable-error-reporting.ts` | Forwards browser-side route errors to Lovable's optional preview telemetry hooks. |

## Guidance

- Keep AI credentials and provider calls in server-only modules such as `ai.server.ts`.
- Validate data entering server functions before using it in database or external-service calls.
- Reuse query options and memory-type definitions so pages display and fetch data consistently.