# Deployment

Production runs three containers from `deploy/docker-compose.prod.yml`:

| Service | Image | Notes |
| --- | --- | --- |
| `db` | `postgres:16-alpine` | Named volume `pos_pgdata`; data persists across deploys. |
| `api` | `ghcr.io/<owner>/<repo>-api:<tag>` | Auto-migrates and seeds on boot. |
| `web` | `ghcr.io/<owner>/<repo>-web:<tag>` | nginx serves the SPA and proxies `/api` to `api:8080`. |

The web image is built with `VITE_API_URL=/api`, so the browser talks to the same
origin and no CORS configuration is needed in production.

## Images

`.github/workflows/deploy.yml` builds and pushes both images to GHCR when:

- a tag matching `v*` is pushed, or
- the workflow is started manually with a custom tag.

Tags produced per run: `<git-tag>` and `latest`.

## Server setup (one time)

1. Install Docker Engine + Compose plugin.
2. Clone the repository somewhere stable, e.g. `/srv/pos`.
3. Copy the environment template and fill in real secrets:
   ```bash
   cp deploy/.env.production.example deploy/.env
   chmod 600 deploy/.env
   ```
4. Log in to GHCR once (needed for private packages):
   ```bash
   echo "<PAT with read:packages>" | docker login ghcr.io -u <github-user> --password-stdin
   ```
5. Start the stack:
   ```bash
   IMAGE_PREFIX=ghcr.io/<owner>/<repo> ./deploy/deploy.sh latest
   ```
6. Bootstrap the admin account (seeding is disabled in production):
   ```bash
   docker compose -f deploy/docker-compose.prod.yml exec api /app/api reset-admin
   ```
   The command uses `DEFAULT_ADMIN_PASSWORD` from `deploy/.env` and creates the admin if it does
   not exist, or rotates its password if it does. To rotate later, update the env value and run the
   same command (or pass `-password` explicitly).

The API creates its schema on boot (`AutoMigrate`). `SEED_DEFAULT_ACCOUNT=false` and
`SEED_DEMO_DATA=false` keep demo tenants/products out of production.

## GitHub configuration

Required repository **variables**:

| Variable | Purpose |
| --- | --- |
| `DEPLOY_ENABLED` | `true` to enable the deploy job. |
| `PRODUCTION_URL` | Optional URL shown in the deployment environment. |

Required repository **secrets**:

| Secret | Purpose |
| --- | --- |
| `DEPLOY_HOST` | Server hostname/IP. |
| `DEPLOY_USER` | SSH user. |
| `DEPLOY_SSH_KEY` | Private key for the deploy user. |
| `DEPLOY_PORT` | Optional SSH port (defaults to 22). |
| `DEPLOY_PATH` | Path to the cloned repo on the server (contains `deploy/`). |
| `GHCR_TOKEN` | PAT with `read:packages` used by the server to pull images. |
| `CI_DB_PASSWORD` | Optional; password for the ephemeral CI Postgres. Defaults to `postgres`. |

Configure branch protection (or repository rules) so `CI / *` checks are required
before merging to `main`.

## Rollback

Every deploy is a tag. To roll back, re-run the workflow with the previous tag, or
on the server:

```bash
IMAGE_PREFIX=ghcr.io/<owner>/<repo> ./deploy/deploy.sh v1.3.0
```

Database migrations are additive (`AutoMigrate` never drops columns), so a
previous image can run against the current schema.

## Local production smoke test

```bash
docker build -f apps/api/Dockerfile -t pos-api:local .
docker build -f deploy/Dockerfile.web -t pos-web:local .

cp deploy/.env.production.example deploy/.env   # edit values
IMAGE_PREFIX=pos IMAGE_TAG=local docker compose -f deploy/docker-compose.prod.yml up -d --build
```

Open `http://localhost` and log in with the seeded admin on first boot.
