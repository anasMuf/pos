#!/usr/bin/env bash
# Deploy or roll back on a server that already has deploy/.env configured.
#
#   ./deploy/deploy.sh <image-tag>
#
# Examples:
#   ./deploy/deploy.sh v1.4.0     # deploy a release tag
#   ./deploy/deploy.sh latest     # deploy the latest main build
set -euo pipefail

cd "$(dirname "$0")/.."

if [ "${1:-}" = "" ]; then
  echo "usage: $0 <image-tag>" >&2
  exit 1
fi

export IMAGE_TAG="$1"
export IMAGE_PREFIX="${IMAGE_PREFIX:?set IMAGE_PREFIX, e.g. ghcr.io/owner/repo}"

COMPOSE="deploy/docker-compose.prod.yml"

echo "==> Pulling ${IMAGE_PREFIX}-api:${IMAGE_TAG} and ${IMAGE_PREFIX}-web:${IMAGE_TAG}"
docker compose -f "$COMPOSE" pull

echo "==> Starting containers"
docker compose -f "$COMPOSE" up -d --remove-orphans

echo "==> Pruning dangling images"
docker image prune -f

echo "==> Current status"
docker compose -f "$COMPOSE" ps
