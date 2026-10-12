# Integrations

This directory contains adapters and configuration for services the application talks to. Keeping service-specific setup here gives routes and shared application logic a consistent place to obtain clients and authentication helpers.

## Contents

| Folder | Purpose |
| --- | --- |
| [`supabase`](supabase/README.md) | Supabase browser and server clients, authentication middleware, generated database types, and preview-session storage. |

## Guidance

- Keep credentials in environment variables; never hard-code secrets in client code.
- Choose the correct client for the execution context. Server-only clients must not be imported into browser-facing modules.
- Keep generated integration files aligned with the Supabase project schema and avoid hand-editing generated code unless the change is intentionally maintained here.