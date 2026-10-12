# Project Routes

This folder contains pages whose URL is scoped to a project. TanStack Start uses the `$id` filename segment for the project's dynamic identifier.

## Files

| File | URL | Purpose |
| --- | --- | --- |
| `$id.tsx` | `/projects/:id` | Loads a project and its memories, then presents the timeline, conversation-ingestion, AI question, and GitHub commit views. |

## Route Behavior

- The route loader preloads project and memory queries through the shared React Query client.
- A missing project uses TanStack Router's not-found handling.
- Data is loaded and changed through the shared Supabase integration and server functions in `src/lib`.
- Keep the `$id` filename syntax when adding other routes that use a dynamic project identifier.