# Frontend Test Structure

Tests are centralized under `apps/platform/tests/`, with shared setup in `src/test/`.

```
tests/
├── unit/        # pure logic/formatting tests
├── component/   # React component tests with Testing Library
└── e2e/         # placeholder for Playwright end-to-end tests
src/test/
├── setup.ts     # global test setup (cleanup)
└── render.tsx   # renderWithProviders (QueryClient + Toast)
```

## Running

```bash
# from repo root
pnpm --filter platform test        # vitest run
pnpm --filter platform test:watch  # vitest watch
```

## Conventions

- **Unit tests** (`tests/unit`): pure functions, no DOM. Import from `../../src/...`.
- **Component tests** (`tests/component`): render with `@testing-library/react`. Use
  `renderWithProviders` from `src/test/render.tsx` when a component needs Query/Toast.
- **E2E** (`tests/e2e`): reserved for Playwright. Add the dependency and config when we start
  browser-level flows (cashier checkout, offline sync).
- Test files use the `*.test.ts` / `*.test.tsx` suffix.
- Prefer role-based queries (`getByRole`) over CSS selectors.

## Adding a test

1. Pure helpers/formatting → `tests/unit`.
2. Component rendering/interaction → `tests/component`.
3. Full user flows across API + UI → `tests/e2e` (after Playwright is added).
