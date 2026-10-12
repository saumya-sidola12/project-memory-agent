# Supabase Integration

This folder centralizes Supabase setup for database access and authentication. The browser client persists a user session, while server-side helpers validate requests or perform trusted server operations.

## Files

| File | Purpose |
| --- | --- |
| `client.ts` | Lazily creates and exports the browser-safe Supabase client using the public URL and publishable key. It also configures storage for preview authentication. |
| `client.server.ts` | Exports a server-only service-role client for trusted administrative operations. Its key bypasses row-level security, so never expose it to browser code. |
| `types.ts` | TypeScript definitions for the Supabase database schema, tables, and relationships. Keep these aligned with the database schema. |
| `auth-attacher.ts` | Client middleware that attaches the signed-in user's access token to TanStack Start server-function requests. |
| `auth-middleware.ts` | Server middleware that validates a bearer token and creates a user-scoped Supabase client and identity context. |
| `cron-auth.ts` | Checks a cron request's bearer token against current and optional previous secrets using timing-safe comparisons. |
| `previewAuthStorage.ts` | Shares a session with the Lovable editor in supported embedded previews and falls back to browser local storage. |

## Environment and Security

- The standard client needs `SUPABASE_URL` and `SUPABASE_PUBLISHABLE_KEY`; browser builds may also use their `VITE_` equivalents.
- The service-role client needs `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` and must only be used in trusted server code.
- Cron authentication uses `LOVABLE_CRON_SECRET` and optionally `LOVABLE_CRON_SECRET_PREVIOUS` during secret rotation.
- Do not send service-role keys or cron secrets to the browser.

Some files are marked as automatically generated. Treat their generated status comments as a warning to avoid manual edits unless the project's generation workflow is being updated too.