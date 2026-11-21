# 🧾 Universal Multi-Capability POS

> Template POS **multi-tenant**, **multi-outlet**, dan **capability-driven** untuk retail, F&B, jasa,
> percetakan, serta clothing/konveksi/sablon — dalam satu basis kode. Berjalan **online-first** dan
> dapat beralih ke **mode offline** dengan sinkronisasi idempotent saat koneksi kembali.

---

## Overview

Sistem ini tidak mengunci alur berdasarkan label jenis usaha. Sebaliknya, perilaku tiap outlet
dikendalikan oleh **capability flag** yang dapat dikonfigurasi per outlet:

| Capability | Fungsi |
| --- | --- |
| `enable_variants` | Varian produk (ukuran, warna, jenis) |
| `enable_modifiers` | Tambahan/topping/finishing |
| `enable_dimension_pricing` | Harga per luas/ukuran (mis. banner m²) |
| `enable_tiered_pricing` | Harga bertingkat berdasarkan qty |
| `enable_order_workflow` | Status pengerjaan `queued → in_progress → ready → completed` |
| `enable_partial_payment` | DP dan pelunasan bertahap |
| `enable_staff_commission` | Komisi staf/operator (rencana tahap lanjut) |

Metadata capability berasal dari registry API (`GET /api/capabilities`), sehingga penambahan
capability baru tidak memerlukan perubahan UI.

```
pos/
├── apps/
│   ├── api/            ← Go REST API (Echo + GORM + PostgreSQL)
│   └── platform/       ← React SPA (TanStack Router + Vite + Tailwind v4)
├── deploy/             ← Dockerfile web, nginx, compose produksi, panduan deploy
├── .github/workflows/  ← CI dan deploy pipeline
├── docs/
│   ├── README.md       ← Workflow dokumentasi produk
│   └── core/           ← PRD, UX Flow, UI Spec, ERD, API Contract (source of truth)
├── docker-compose.yml  ← PostgreSQL untuk development
├── nx.json
├── pnpm-workspace.yaml
└── package.json
```

---

## Tech Stack

### Backend (`apps/api`)

| Kategori | Teknologi |
| --- | --- |
| Language | Go 1.25 |
| Framework | [Echo v4](https://echo.labstack.com/) |
| ORM / DB | [GORM](https://gorm.io/) + PostgreSQL 16 |
| Auth | JWT (`golang-jwt/jwt`) + RBAC per outlet |
| Validation | [go-playground/validator](https://github.com/go-playground/validator) |
| API Docs | [Swagger](https://github.com/swaggo/swag) |
| Hot Reload | [Air](https://github.com/air-verse/air) |

### Frontend (`apps/platform`)

| Kategori | Teknologi |
| --- | --- |
| Language | TypeScript 6 |
| Framework | React 19 |
| Build | Vite 8 |
| Routing | TanStack Router (file-based) |
| Data | TanStack Query |
| Styling | Tailwind CSS v4 + Lucide |
| Linter | Biome |
| Offline | IndexedDB + localStorage outbox |
| E2E | Playwright (Chromium) |

### Tooling

| Kategori | Teknologi |
| --- | --- |
| Package manager | pnpm 12 (workspaces) |
| Build orchestrator | Nx |
| Container | Docker + nginx |
| Registry | GHCR |

---

## Prerequisites

- **Node.js** ≥ 22
- **pnpm** ≥ 12 (`corepack enable`)
- **Go** ≥ 1.25
- **Docker** (disarankan) atau PostgreSQL ≥ 15
- **Git**

---

## Getting Started

### 1. Install dependencies

```bash
git clone <repository-url>
cd pos
pnpm install
```

### 2. Environment

Salin template lalu sesuaikan:

```bash
cp .env.example .env
```

```env
# Backend
PORT=8080
JWT_SECRET=supersecretkey
DB_HOST=127.0.0.1
DB_USER=postgres
DB_PASSWORD=postgres
DB_NAME=pos_db
DB_PORT=5433
SSL_MODE=disable

# Frontend
VITE_API_URL=http://localhost:8080/api

# Seeder (matikan di production)
SEED_DEFAULT_ACCOUNT=true
```

> `docker-compose.yml` memetakan port host `${DB_PORT:-5432}` ke PostgreSQL container. Jika port
> `5432` sudah dipakai PostgreSQL lokal, gunakan `DB_PORT=5433` seperti contoh di atas.

### 3. Jalankan database

```bash
docker compose up -d
```

Tabel dibuat otomatis oleh GORM (`AutoMigrate`) saat API pertama kali berjalan.

### 4. Akun seed default

Saat pertama kali dijalankan, seeder membuat admin beserta data demo (tenant, 2 outlet dengan
capability berbeda, produk, dan varian) **jika seeding diaktifkan**:

| Field | Value |
| --- | --- |
| Email | `admin@pos.local` |
| Password | `admin123` (fallback dev) atau `DEFAULT_ADMIN_PASSWORD` |
| Username | `admin` |
| Role | `admin` (global admin, owner kedua outlet) |

Kontrol seeding:

| Variable | Efek |
| --- | --- |
| `SEED_DEFAULT_ACCOUNT=false` | Tidak membuat/mengubah akun admin saat boot |
| `SEED_DEMO_DATA=false` | Tidak membuat tenant/outlet/produk demo |
| `DEFAULT_ADMIN_PASSWORD` | Mengganti password admin saat akun dibuat |

Di production kedua flag seeding diset `false`. Untuk bootstrap/merotasi password admin gunakan
subcommand bawaan API (aman dijalankan berulang):

```bash
cd apps/api
go run . reset-admin          # memakai DEFAULT_ADMIN_PASSWORD dari root .env
# atau eksplisit:
go run . reset-admin -email admin@pos.local -password '...'
```

Di container produksi:

```bash
docker compose -f deploy/docker-compose.prod.yml exec api /app/api reset-admin
```

Seeder bersifat idempotent (tidak menduplikasi data).

### 5. Jalankan development

```bash
pnpm dev                 # API (8080) + Platform (3000)
pnpm --filter api dev     # API saja
pnpm --filter platform dev # Platform saja
```

Buka `http://localhost:3000`.

### 6. Build production

```bash
pnpm build
```

---

## Fitur Utama

### Operasional kasir
- Katalog dengan pencarian + shortcut `F2` (cari), `F9` (bayar), `Esc` (tutup modal).
- Varian, modifier, harga dimensi (server menghitung area), dan harga bertingkat.
- Diskon persen/nominal + pajak, dihitung **server-side**.
- Pembayaran `full`, `down_payment`, `settlement`; metode `cash`, `qris`, `transfer`.
- Shift kasir: buka/tutup, kas awal, kas sistem, selisih.
- Struk per outlet (header/footer, ukuran kertas, tampilkan pelanggan/kasir/rincian bayar) + print.

### Pesanan & produksi
- Alur status pengerjaan bila capability aktif; kasir, pengelola, dan **operator produksi** dapat
  memperbarui status (pembayaran tetap khusus kasir/pengelola).
- Pelunasan dari halaman Pesanan.
- Pelanggan per outlet dengan riwayat pesanan.

### Inventori & laporan
- Stok masuk/keluar/opname, stok minimum, mutasi otomatis saat penjualan.
- Laporan ringkasan lintas outlet, rekonsiliasi sinkronisasi offline, export CSV.
- Komisi staf opsional per produk (persen dari subtotal atau nominal per unit) dengan laporan
  komisi per staf; hanya dihitung bila capability `enable_staff_commission` aktif.

### Akses & multi-outlet
- Data terisolasi per tenant/outlet.
- Role outlet: `owner`, `manager`, `cashier`, `operator`.
- UI sadar-role: menu dan aksi manage-only disembunyikan (`canManage` / `canOperate`);
  API tetap menegakkan RBAC.

### Offline-first
- Mode online (default) dapat dialihkan ke offline dari header/Pengaturan.
- Produk, outlet, pengaturan struk, dan respons laporan terakhir di-cache di IndexedDB.
- Transaksi offline masuk outbox dan disinkronkan otomatis saat online.
- Setiap order disinkronkan individual; kegagalan tidak memblokir antrean dan dapat di-retry
  per transaksi dari Pengaturan.
- Idempotensi via `client_sync_id` (order) dan `client_payment_id` (payment); duplikat dihitung,
  bukan digabung.

---

## Domain Rules

- **Pricing**: `fixed`, `dimension` (area = lebar × tinggi, minimum area), `tiered`. Harga dari
  client diabaikan; server selalu menghitung ulang (`service/pricing_service.go`).
- Semua form tambah/edit berada di halaman/route sendiri (produk, varian, pelanggan, mutasi stok,
  buka/tutup shift, pelunasan, serta pengaturan outlet). Halaman daftar/detail hanya menautkan.
- Katalog dapat dibuat, diedit (termasuk pricing rules & modifiers), dan dihapus dari halaman Produk;
  varian juga mendukung tambah, edit, dan hapus. Stok diubah melalui mutasi di halaman Inventori.
- Informasi outlet (nama, alamat, mode koneksi bawaan), capability, anggota/role, dan pengaturan struk
  dikelola dari halaman detail outlet oleh owner/manager.
- **Diskon & pajak**: `discount_percent + discount_amount` di-cap pada subtotal, lalu `tax_percent`
  berlaku atas subtotal setelah diskon. Total disimpan di `orders.total_amount`.
- **Status pembayaran**: `unpaid`, `partial`, `paid`.
- **Order workflow**: `queued → in_progress → ready → completed` atau `cancelled`.
- **Mutasi stok**: `stock_in`, `stock_out`, `sale`, `adjustment`, `sync_reconcile`.
- **Scope laporan**: owner/manager; total memakai `created_at` server; rekonsiliasi memakai
  `is_offline_created` + `synced_at`.

Detail lengkap ada di [`docs/core/`](docs/core/): PRD, UX Flow, UI Spec, ERD, dan API Contract.

---

## Project Architecture

### Backend — clean architecture

```
apps/api/
├── main.go                 ← Entry point: config, AutoMigrate, seeder, server
├── config/database.go      ← ENV loader + GORM connection
├── model/                  ← Entitas GORM + registry capability
├── dto/                    ← Request/response contract + validasi
├── repository/repository.go← Generic repository GORM
├── service/                ← Business logic (pricing, order, access, report, dst.)
├── handler/                ← HTTP handler + error mapping
├── middleware/             ← JWT, logging, CORS
├── utility/                ← Custom validator
├── seeders/                ← Admin + data demo (idempotent)
├── docs/                   ← Swagger hasil generate
├── tests/
│   ├── unit/               ← Test murni (pricing)
│   ├── integration/        ← HTTP + PostgreSQL
│   ├── helpers/            ← Harness DB/HTTP
│   └── fixtures/           ← Seed graph
└── Dockerfile              ← Image API (multi-stage, non-root)
```

Alur request:

```
Request → Middleware (CORS, logging, JWT) → Handler → Service → Repository → PostgreSQL
```

### Frontend — feature-based

```
apps/platform/src/
├── routes/
│   ├── login.tsx, register.tsx
│   ├── _authenticated.tsx           ← Layout + role-aware navigation
│   └── _authenticated/
│       ├── index.tsx                ← Dashboard
│       ├── pos.tsx                  ← Kasir
│       ├── orders/                  ← index, $id/payment
│       ├── customers/               ← index, new, $id/edit
│       ├── shifts/                  ← index, new, $id/close
│       ├── inventory/               ← index, new
│       ├── products/                ← index, new, $id/edit, $id/variants/*
│       ├── outlets/                 ← index, new, $id/* (detail, edit, capabilities,
│       │                              members/new, receipt-settings)
│       ├── reports.tsx
│       └── settings.tsx
├── features/
│   ├── app/        ← AppContext (outlet aktif, mode, outbox), navigation, connectivity
│   ├── auth/       ← Login, register, AuthContext
│   ├── pos/        ← Katalog, keranjang, checkout
│   ├── orders/     ← Daftar pesanan, pelunasan
│   ├── customers/  ← CRUD pelanggan + riwayat
│   ├── shifts/     ← Buka/tutup shift
│   ├── inventory/  ← Stok + mutasi
│   ├── products/   ← Katalog + varian
│   ├── outlets/    ← Outlet, member, capability, struk
│   ├── reports/    ← Ringkasan + rekonsiliasi
│   ├── receipts/   ← Render & print struk
│   └── settings/   ← Akun, koneksi, antrean offline
├── components/     ← atoms/ + molecules/
├── api/            ← client, queries, types (+ endpoint Orval)
└── lib/            ← format, pricing, offlineDb, offlineQueue, roles, capabilities,
                       receipt, reports, csv, connectivity, authState
```

---

## API Endpoints

Semua endpoint (kecuali health/register/login) memerlukan `Authorization: Bearer <token>`.

| Area | Endpoint |
| --- | --- |
| Health | `GET /api/health` |
| Auth | `POST /api/users/register`, `POST /api/users/login`, `GET /api/users` |
| Tenant | `GET/POST /api/tenants`, `GET/PATCH/DELETE /api/tenants/:id` |
| Capability registry | `GET /api/capabilities` |
| Outlet | `GET/POST /api/outlets`, `GET/PATCH/DELETE /api/outlets/:id` |
| Akses outlet | `GET /api/outlets/:id/access`, `PATCH /api/outlets/:id/capabilities` |
| Member outlet | `GET/POST /api/outlets/:outlet_id/members`, `PATCH/DELETE .../members/:member_id` |
| Struk | `GET/PUT /api/outlets/:outlet_id/receipt-settings` |
| Produk | `GET/POST /api/products`, `GET/PATCH/DELETE /api/products/:id` |
| Varian | `GET/POST /api/products/:product_id/variants`, `PATCH/DELETE .../:variant_id` |
| Pelanggan | `GET/POST /api/customers`, `GET/PATCH/DELETE /api/customers/:id` |
| Stok | `GET/POST /api/stock-movements` |
| Shift | `GET /api/cash-shifts`, `POST /api/cash-shifts/open`, `GET /api/cash-shifts/:id`, `POST /api/cash-shifts/:id/close` |
| Pesanan | `GET/POST /api/orders`, `GET/DELETE /api/orders/:id`, `PATCH /api/orders/:id/status` |
| Pembayaran | `POST /api/orders/:id/payments` |
| Sinkronisasi | `POST /api/sync/orders` |
| Laporan | `GET /api/reports/summary`, `GET /api/reports/reconciliation` |

Kontrak lengkap (request, response envelope, status code): [`docs/core/api-contract.md`](docs/core/api-contract.md).

### Swagger

```
http://localhost:8080/swagger/index.html
```

Regenerasi setelah mengubah handler/DTO:

```bash
cd apps/api && swag init -g main.go -o docs
```

---

## Testing

### Backend

```bash
# Unit (pricing, dsb.)
pnpm --filter api test:unit

# Seluruh test tanpa DB (integration otomatis skip)
pnpm --filter api test

# Integration dengan PostgreSQL test
TEST_DB_DSN="host=127.0.0.1 port=5433 user=postgres password=postgres dbname=pos_test sslmode=disable" \
  pnpm --filter api test
```

### Frontend

```bash
pnpm --filter platform test        # Vitest: unit + component
```

### E2E (Playwright)

```bash
pnpm --filter platform exec playwright install chromium  # sekali
pnpm test:e2e
```

Mencakup role-aware navigation dan checkout dengan diskon/pajak terhadap API nyata. Spec otomatis
skip bila `GET /api/health` tidak terjangkau. Detail: [`apps/platform/tests/e2e/README.md`](apps/platform/tests/e2e/README.md).

---

## Available Scripts

### Root

| Command | Deskripsi |
| --- | --- |
| `pnpm dev` | Jalankan semua app |
| `pnpm build` | Build semua app |
| `pnpm test` | Test seluruh workspace |
| `pnpm test:api` / `pnpm test:platform` | Test per app |
| `pnpm test:e2e` | Playwright E2E |
| `pnpm --filter platform generate:api` | Generate hook Orval dari Swagger |

### API

| Command | Deskripsi |
| --- | --- |
| `pnpm --filter api dev` | Hot reload (Air) |
| `go run . reset-admin` (di `apps/api`) | Buat/rotasi password admin |
| `pnpm --filter api build` | Build binary ke `apps/api/bin/api` |
| `pnpm --filter api test:unit` / `test:integration` | Test per layer |

### Platform

| Command | Deskripsi |
| --- | --- |
| `pnpm --filter platform dev` | Dev server (3000) |
| `pnpm --filter platform build` | Build produksi |
| `pnpm --filter platform lint` / `format` | Biome |
| `pnpm --filter platform generate:api` | Orval codegen |

---

## Environment Variables

| Variable | App | Deskripsi | Default |
| --- | --- | --- | --- |
| `PORT` | API | Port API | `8080` |
| `JWT_SECRET` | API | Secret signing JWT | — |
| `DB_HOST` | API | Host PostgreSQL | `localhost` |
| `DB_PORT` | API | Port PostgreSQL | `5432` |
| `DB_USER` | API | User DB | `postgres` |
| `DB_PASSWORD` | API | Password DB | — |
| `DB_NAME` | API | Nama DB | `pos_db` |
| `SSL_MODE` | API | SSL mode | `disable` |
| `SEED_DEFAULT_ACCOUNT` | API | Seed/buat admin saat boot (`false` untuk production) | `true` |
| `SEED_DEMO_DATA` | API | Seed tenant/outlet/produk demo (`false` untuk production) | `true` |
| `DEFAULT_ADMIN_PASSWORD` | API | Password admin saat dibuat (fallback `admin123`) | — |
| `TEST_DB_DSN` | API test | DSN database test | — |
| `VITE_API_URL` | Platform | Base URL API | `http://localhost:8080/api` |
| `E2E_BASE_URL` | E2E | URL frontend | `http://localhost:3000` |
| `E2E_API_URL` | E2E | URL API | `http://localhost:8080/api` |
| `E2E_ADMIN_EMAIL` / `E2E_ADMIN_PASSWORD` | E2E | Kredensial admin | `admin@pos.local` / `admin123` |

`.env` berada di root dan tidak boleh di-commit. Untuk production gunakan
[`deploy/.env.production.example`](deploy/.env.production.example).

---

## CI/CD & Deployment

CI (`.github/workflows/ci.yml`) berjalan pada setiap PR dan push ke `main`:

1. **Web** — Biome lint, `tsc --noEmit`, Vitest, Vite build.
2. **API** — `gofmt` check, `go vet`, `go build`, unit test.
3. **Integration** — test API terhadap service PostgreSQL.
4. **E2E** — Playwright dengan API + Vite yang dijalankan CI.
5. **Security** — `pnpm audit` (advisory *critical*).

Deploy (`.github/workflows/deploy.yml`) berjalan saat tag `v*` di-push atau manual: image API dan
web/nginx dibangun, dipush ke GHCR, lalu opsional di-deploy via SSH (`DEPLOY_ENABLED=true`).

```bash
# Build image lokal
docker build -f apps/api/Dockerfile -t pos-api:local .
docker build -f deploy/Dockerfile.web -t pos-web:local .
```

Arsitektur produksi: `db` (PostgreSQL) + `api` (Go) + `web` (nginx, proxy `/api` ke API).
Panduan lengkap, daftar secret, dan rollback: [`deploy/README.md`](deploy/README.md).

---

## Documentation

Source of truth produk ada di [`docs/core/`](docs/core/):

```
docs/
├── README.md          ← Workflow dokumentasi (PRD → UX Flow → UI Spec → ERD → API Contract)
├── core/
│   ├── prd.md
│   ├── ux-flow.md
│   ├── ui-spec.md
│   ├── erd.md
│   └── api-contract.md
└── issue/
```

`AGENTS.md` berisi konvensi teknis dan batasan kontribusi (wajib diperbarui saat mengubah skema DB,
contract API, atau perilaku domain).

---

## License

ISC
