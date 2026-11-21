# AGENTS.md — Universal Multi-Capability POS

This file is the persistent project context for AI agents. Read it before making changes.
The product/spec source of truth lives in `docs/core/` (PRD → UX Flow → UI Spec → ERD → API Contract).

## Project

Universal Multi-Capability POS template: multi-tenant, multi-outlet, capability-flag driven POS
that supports retail, F&B, services, printing, clothing/konveksi/sablon, with an online-first mode
that can switch to offline and sync back idempotently.

## Tech Stack

- Backend `apps/api`: Go 1.25, Echo v4, GORM + PostgreSQL, JWT, go-playground/validator, Swagger (swag), Air.
- Frontend `apps/platform`: React 19, TypeScript, Vite, TanStack Router (file-based), TanStack Query,
  Tailwind CSS v4, Lucide icons, Biome, Orval.
- Monorepo: pnpm workspaces + Nx.

## Commands

- Install: `pnpm install`
- Run all: `pnpm dev`
- API only: `pnpm --filter api dev`
- Platform only: `pnpm --filter platform dev` (port 3000)
- API build: `pnpm --filter api build`
- Platform build: `pnpm --filter platform build`
- Platform lint/format: `pnpm --filter platform lint` / `format`
- Regenerate Swagger: `cd apps/api && swag init -g main.go -o docs`
- Regenerate frontend API hooks: `pnpm --filter platform generate:api`
- API tests: `pnpm --filter api test` (integration auto-skips without `TEST_DB_DSN`)
- Admin bootstrap / password rotation: `go run . reset-admin` in `apps/api` (uses
  `DEFAULT_ADMIN_PASSWORD` or `-password`); production seeding stays off via
  `SEED_DEFAULT_ACCOUNT=false` + `SEED_DEMO_DATA=false`.
- API unit only: `pnpm --filter api test:unit`
- Platform tests: `pnpm --filter platform test`
- E2E tests (Playwright, needs API + Vite running): `pnpm test:e2e`; install browsers once with
  `pnpm --filter platform exec playwright install chromium`.
- CI: `.github/workflows/ci.yml` (web lint/types/test/build, API format/vet/build/unit,
  integration+E2E with Postgres services, critical dependency audit).
- Deploy: push tag `v*` → `.github/workflows/deploy.yml` builds GHCR images and optionally SSH-deploys;
  see `deploy/README.md` (`apps/api/Dockerfile`, `deploy/Dockerfile.web`, `deploy/docker-compose.prod.yml`).
- DB up: `docker compose up -d`

## Testing

- Backend tests live under `apps/api/tests/`: `unit/` (pure), `integration/` (HTTP + Postgres),
  `helpers/` (DB/HTTP harness), `fixtures/` (seed graphs). Integration uses `api/server.New` via
  `httptest` and a dedicated `pos_test` database (`TEST_DB_DSN`).
- Frontend tests live under `apps/platform/tests/`: `unit/`, `component/`, and `e2e/` (Playwright,
  `playwright.config.ts`). Shared setup is in `apps/platform/src/test/`. E2E specs skip themselves when
  `GET /api/health` is unreachable; see `apps/platform/tests/e2e/README.md`.
- Run integration tests with:
  `TEST_DB_DSN="host=127.0.0.1 port=5433 user=postgres password=postgres dbname=pos_test sslmode=disable" pnpm --filter api test`

## Conventions — Backend

- Clean architecture: `handler → service → repository → model`.
- All entities embed `model.PrimaryKey` and `model.BaseModelTimeAt` (soft delete via `deleted_at`).
- Request DTOs use `validate:"..."` tags; handlers bind then `c.Validate`.
- Responses use `dto.SuccessResponse{Message, Data}`; errors flow through `handler.CustomHTTPErrorHandler`.
- JWT claims available in handlers via `c.Get("user_id")` and `c.Get("email")`.
- Money/qty stored as `float64` with Postgres `decimal(...)`; JSONB stored via `model.JSON` / `model.Capabilities`.
- Route registration and DI wiring live in `apps/api/main.go`.

## Conventions — Frontend

- File-based routes in `src/routes`; protected pages under `_authenticated/`.
- **Setiap form tambah/edit punya route sendiri** (`/products/new`, `/products/$id/edit`,
  `/customers/$id/edit`, `/inventory/new`, `/shifts/new`, `/outlets/$id/edit`, `/tenants/$id/edit`, dst).
  Halaman list/detail hanya menautkan ke route tersebut; jangan menaruh form CRUD inline atau di modal.
  Pengecualian: `ItemConfigurator` di POS (alur transaksi) dan `ReceiptModal` (preview).
- Form wajib punya validasi inline per field (`FieldError` + `aria-invalid`) dan fokus ke field pertama
  yang gagal; toast hanya ringkasan. Halaman edit wajib punya not-found/error state, bukan form kosong.
- Anggota outlet dipilih dari hasil `GET /api/users/search` (`useSearchUsers`), bukan input `user_id` mentah.
- Preset capability hanya didefinisikan di `src/lib/capabilities.ts` (`CAPABILITY_PRESETS`); form create dan
  edit outlet sama-sama memakai preset + Reset.
- Atomic components: `components/atoms/{Button,Input,Label,Select,FieldError}`; molecules:
  `{FormField,ConfirmDialog,Toast}` plus `molecules/ui` (`PageHeader`, `Card`, `EmptyState`, `AccessDenied`,
  `Spinner`, `Table`, `Badge`, `ErrorAlert`).
- Use the shared fetch mutator (`src/api/mutator/custom-instance.ts`) and typed hooks.
- Follow existing Tailwind + indigo palette and the compact card/list style.
- Feature code lives in `src/features/<feature>/`.
- POS shortcuts: `F2` focuses search, `F9` checks out, `Esc` closes the item modal.
- Reports support CSV export via `src/lib/csv.ts`.
- Role-aware UI: `AppContext` exposes `role`, `isGlobalAdmin`, `canManage`, `canOperate`, `canFulfill`
  from `GET /outlets/:id/access` (cached in localStorage for offline). Gate nav entries with
  `filterNavItems` (`features/app/navigation.ts`) and hide manage-only actions; the API still enforces RBAC.
  `canFulfill` allows all members (including `operator`) to update order work status.
- Capability flags render from the API registry (`useCapabilityRegistry`, `src/lib/capabilities.ts`),
  so new capabilities need no bespoke UI code.

## Domain rules (from docs/core)

- Capabilities are configurable per outlet (`enable_variants`, `enable_modifiers`,
  `enable_dimension_pricing`, `enable_tiered_pricing`, `enable_order_workflow`, `enable_partial_payment`,
  `enable_staff_commission`). Metadata lives in `apps/api/model/capability.go` and is served by
  `GET /api/capabilities`; add new capabilities there instead of editing UI structs.
- Pricing types: `fixed`, `dimension`, `tiered`.
- Order workflows: `queued → in_progress → ready → completed` (or `cancelled`).
- Payment status: `unpaid`, `partial`, `paid`. Payment types: `full`, `down_payment`, `settlement`.
  Payment methods: `cash`, `qris`, `transfer`.
- Outlet roles: `owner`, `manager`, `cashier`, `operator`.
- Offline sync is idempotent via `client_sync_id` (orders) and `client_payment_id` (payments).
- Offline v2: connectivity = browser online state + `GET /api/health`; products/outlets/receipt settings
  and last report responses are cached in IndexedDB (`src/lib/offlineDb.ts`), the auth profile is cached
  in localStorage, and the outbox auto-syncs when the connection returns. Each offline order is synced
  individually so one failure does not block the queue; failed `client_sync_id`s are tracked and can be
  retried per order from Pengaturan. Conflicting duplicates are counted (not merged) by the server via
  `client_sync_id`, so retries never create double orders.
- Customers are scoped per outlet (`customers` table); orders may reference `customer_id` and keep a
  `customer_name` snapshot.
- Receipt settings are per outlet (`receipt_settings`); the frontend renders and prints receipts from
  order + settings (`src/lib/receipt.ts`, `src/features/receipts/`).
- Reports (`GET /api/reports/summary`, `GET /api/reports/reconciliation`) are owner/manager scoped;
  totals use server `created_at`; offline reconciliation uses `is_offline_created` + `synced_at`.
- Stock movements types: `stock_in`, `stock_out`, `sale`, `adjustment`, `sync_reconcile`.
- Server is authoritative for pricing: client `unit_price` is ignored; dimension/tiered/modifier/area are recomputed in `service/pricing_service.go`.
- Discount/tax are server-computed: `discount_percent` + `discount_amount` are capped at subtotal, then
  `tax_percent` applies to the discounted subtotal; `orders` stores `discount_amount`, `tax_amount`, and
  the final `total_amount` (`computeOrderTotals` in `service/order_service.go`).
- Staff commission (PTH): when `enable_staff_commission` is active, each order line snapshots
  `commission_amount` from the product rule (`commission_type` = `percent` of subtotal or `fixed` per
  unit); `orders.commission_amount` aggregates it and is attributed to `cashier_user_id`. Report:
  `GET /api/reports/commissions`.
- Payments are validated server-side: `full` settles the remaining balance; DP/settlement must be > 0 and cannot exceed the remaining balance.

## Boundaries

- Never commit `.env` or secrets.
- Do not change DB schema without updating `docs/core/erd.md`.
- Do not change API shapes without updating `docs/core/api-contract.md`.
- Keep the documented response envelope; do not introduce a new error format.
- Run `go build ./...` (in `apps/api`) and `pnpm --filter platform build` before finishing.
