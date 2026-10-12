# Hooks

This folder contains reusable React hooks that expose browser or application state to components without duplicating event-handling logic.

## Contents

| File | Purpose |
| --- | --- |
| `use-mobile.tsx` | Exports `useIsMobile()`, which reports whether the viewport is narrower than the shared 768-pixel breakpoint and tracks viewport changes. |

## Guidance

- Keep hooks reusable and focused on one behavior.
- Clean up browser event listeners when the hook's component unmounts or its dependencies change.
- Keep the breakpoint in sync with the responsive behavior used by the interface.