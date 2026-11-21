# E2E Tests (Playwright)

End-to-end tests that drive the real frontend against the real API using Chromium.

## Coverage

- `authorization.spec.ts` — role-aware navigation:
  - admin sees `Outlet` and `Laporan`;
  - cashier assigned to the outlet sees `Kasir`/`Pesanan` but not `Outlet`/`Laporan`;
  - direct `/reports` access shows the "Akses dibatasi" state;
  - manage-only actions (Tambah Produk) are hidden for cashiers.
- `checkout.spec.ts` — POS checkout with discount and tax:
  - adds a product, applies 10% discount + 11% tax;
  - asserts the `POST /api/orders` response is `201` and that
    `discount_amount`, `tax_amount`, and `total_amount` match server-side math;
  - verifies the success toast and that the order appears on `/orders`.

## Prerequisites

1. PostgreSQL is up: `docker compose up -d`.
2. API is running with seeded admin (`SEED_DEFAULT_ACCOUNT=true`):
   `pnpm --filter api dev`
3. Frontend is either running (`pnpm --filter platform dev`) or Playwright will
   start it automatically.

Default credentials: `admin@pos.local` / `admin123`.

## Run

```bash
pnpm --filter platform exec playwright install chromium  # once
pnpm test:e2e                                            # from repo root
# or
pnpm --filter platform test:e2e:ui                       # interactive mode
```

## Environment overrides

| Variable | Default | Purpose |
| --- | --- | --- |
| `E2E_BASE_URL` | `http://localhost:3000` | Frontend URL |
| `E2E_API_URL` | `http://localhost:8080/api` | API base URL |
| `E2E_ADMIN_EMAIL` | `admin@pos.local` | Seeded admin email |
| `E2E_ADMIN_PASSWORD` | `admin123` | Seeded admin password |
| `E2E_NO_WEBSERVER` | unset | Set to `1` to never start Vite |

## Notes

- Tests **skip** (with a message) when `GET /api/health` is unreachable, so they
  never produce false failures in environment without a backend.
- The authorization spec registers a unique cashier (`e2e-cashier-<timestamp>@example.com`)
  and assigns it to the first outlet. There is no user-delete endpoint yet, so
  these users accumulate in dev databases. Use a dedicated dev database if that matters.
- The checkout spec creates a real order in the dev database on every run.
