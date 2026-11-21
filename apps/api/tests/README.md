# Backend Test Structure

All Go tests live under `apps/api/tests/`. This keeps test discovery predictable and
separates pure unit tests from Postgres-backed integration tests.

```
tests/
├── helpers/        # shared harness (DB setup, in-process HTTP client)
│   ├── db.go
│   └── http.go
├── fixtures/       # reusable seed graphs
│   └── seed.go
├── unit/           # pure tests, no database
│   └── pricing_test.go
└── integration/    # HTTP + Postgres end-to-end tests
    ├── auth_test.go
    ├── authorization_test.go
    └── pricing_order_test.go
```

## Running

Unit tests (no database needed):

```bash
cd apps/api
go test ./tests/unit/...
```

All tests (integration tests skip automatically when `TEST_DB_DSN` is unset):

```bash
cd apps/api
go test ./...
```

Integration tests against a dedicated test database:

```bash
# create once
docker compose exec db createdb -U postgres pos_test

# run
cd apps/api
TEST_DB_DSN="host=127.0.0.1 port=5433 user=postgres password=postgres dbname=pos_test sslmode=disable" \
  go test ./tests/...
```

`helpers.TestDB` auto-migrates and truncates all tables before each integration test, so tests
must never point `TEST_DB_DSN` at a real database.

## Conventions

- **Unit tests** (`tests/unit`): pure functions, no DB, no HTTP. Import the package under test.
- **Integration tests** (`tests/integration`): use `helpers.TestDB`, `fixtures.SeedBase`, and
  `helpers.NewClient`. The client boots the real Echo app via `api/server.New` on `httptest`.
- **Helpers** (`tests/helpers`): add DB/HTTP utilities here, not inside test files.
- **Fixtures** (`tests/fixtures`): add reusable seed graphs here.
- Integration tests are skipped unless `TEST_DB_DSN` is set.
- Set `JWT_SECRET` in the environment for tests that exercise auth (the helper defaults it to
  `test-secret` when empty).

## Adding a test

1. Put domain/pricing logic tests in `tests/unit/`.
2. Put endpoint/auth/capability flows in `tests/integration/`.
3. Reuse `helpers.NewClient` + `fixtures.SeedBase` instead of rebuilding fixtures.
