# Components

This directory holds reusable React components used to build the app's interface. Components shared across pages should live here rather than being copied into individual routes.

## Contents

| Item | Purpose |
| --- | --- |
| [`ui/`](ui/README.md) | Reusable, accessible interface primitives such as buttons, dialogs, forms, navigation, and data-display controls. |

There are currently no component files directly in this directory. Page-specific sections remain alongside their route until they need to be shared.

## Guidance

- Prefer the existing components in `ui` before introducing another implementation of a common control.
- Keep shared components focused and configurable through props.
- Import icons from the project's existing `lucide-react` dependency when an icon is needed.