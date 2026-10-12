# Routes

TanStack Start uses **file-based routing**. Every `.tsx` file in this directory
defines a route. Do **not** create `src/pages/`, `src/routes/_app/index.tsx`, or
`app/layout.tsx` — those are Next.js / Remix conventions. The only root layout
is `src/routes/__root.tsx`.

## Conventions

| File | URL |
| --- | --- |
| `index.tsx` | `/` |
| `about.tsx` | `/about` |
| `users/index.tsx` | `/users` |
| `users/$id.tsx` | `/users/:id` (dynamic — bare `$`, no curly braces) |
| `posts/{-$category}.tsx` | `/posts/:category?` (optional segment) |
| `files/$.tsx` | `/files/*` (splat — read via `_splat` param, never `*`) |
| `_layout.tsx` | layout route (renders children via `<Outlet />`) |
| `__root.tsx` | app shell — wraps every page; preserve `<Outlet />` |


# Application Routes

This folder contains the pages and shared route layout for Recall. TanStack Start builds the URL map from the route files here; route loaders can prepare data before a page renders.

## Current Routes

| File | URL or role | Purpose |
| --- | --- | --- |
| `__root.tsx` | Shared root layout | Sets document metadata and styles, provides React Query, renders nested pages, and defines the app-wide not-found and error screens. Keep its `<Outlet />`; child routes render there. |
| `index.tsx` | `/` | Loads and displays projects, and provides the form for creating a project. |
| [`projects/$id.tsx`](projects/$id.tsx) | `/projects/:id` | Shows a project and its memory timeline, conversation-import form, AI question view, and GitHub commit view. |
| `../routeTree.gen.ts` | Generated file | TanStack Router's generated route tree. It is stored in `src`, one directory above this folder. Do not edit it by hand. |

## How File-Based Routing Works

- A route file named `index.tsx` maps to the URL of its directory. In this folder, it maps to `/`.
- A `$name` segment represents a dynamic URL parameter. The `$id.tsx` route under `projects` maps to `/projects/:id`, and the route reads the value as `id`.
- Nested route files belong in matching folders. For example, a new `settings.tsx` here would map to `/settings`.
- The `__root.tsx` file is the app-wide route shell. It is not a regular page and must render `<Outlet />` for child pages to appear.
- Add or rename route files here and let the TanStack Router plugin regenerate `src/routeTree.gen.ts`.

## Route Data and Components

- Use a route `loader` for data that should be ready before the route renders. Reuse the shared React Query client and query options where appropriate.
- Keep page-specific UI with its route. Move components into `src/components` when multiple routes need them.
- Use shared data access, Supabase integration, and server functions from their existing modules rather than duplicating that logic inside routes.
- Keep browser code free of server-only modules and secrets.
