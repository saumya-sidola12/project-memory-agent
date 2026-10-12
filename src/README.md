# Source Code

This directory contains the application code for Recall, a project-memory app built with React, TanStack Start, and Supabase. The app lets users organize projects, save useful facts from developer conversations, search those facts with AI, and view related GitHub commits.

## Files

| File | Purpose |
| --- | --- |
| `router.tsx` | Creates the TanStack Router and its React Query client. |
| `routeTree.gen.ts` | Generated route tree assembled from the route files. Do not edit by hand. |
| `server.ts` | Server entry point; delegates requests to TanStack Start and formats catastrophic server-rendering errors. |
| `start.ts` | Configures TanStack Start middleware for Supabase authentication, error handling, and CSRF protection. |
| `styles.css` | Tailwind setup and the app's shared design tokens, colors, fonts, and base styles. |

## Folders

| Folder | Purpose |
| --- | --- |
| [`components`] | Reusable interface components, including the shared UI primitives. |
| [`hooks`]| Reusable React hooks. |
| [`integrations`]| Connections to external services used by the app. |
| [`lib`]| Shared application logic, data helpers, AI functions, and error handling. |
| [`routes`] | File-based pages and layouts for TanStack Router. |
| [`test`](test/README.md) | Vitest tests and shared browser-test setup. |

## Working in This Directory

- Add pages under `routes`; TanStack's route plugin updates the generated route tree.
- Keep browser-safe code separate from server-only code. Files ending in `.server.ts` must not be imported into browser components.
- Use the shared Supabase integration and UI components rather than creating duplicate clients or primitives.
- Run `npm test` for tests and `npm run build` to check the production build.