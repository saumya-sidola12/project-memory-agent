# Tests

This folder contains the Vitest tests for application behavior and the shared setup used by the test environment.

## Files

| File | Purpose |
| --- | --- |
| `app-routing.test.tsx` | Checks that the generated TanStack route tree matches the home page instead of falling through to the root not-found route. |
| `normalize-repo.test.ts` | Checks that GitHub URLs and repository strings normalize to `owner/repo`, and that invalid input is rejected. |
| `setup.ts` | Loads Testing Library's Vitest matchers and provides browser API stubs for the jsdom environment. |

## Running Tests

- Run all tests once with `npm test`.
- Run Vitest in watch mode with `npm run test:watch`.
- Keep tests focused on observable behavior and update them when the behavior they cover changes.