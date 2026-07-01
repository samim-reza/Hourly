#!/usr/bin/env bash
# Hourly VPS deploy — pull, rebuild, start, show logs
# Usage: ./deploy.sh
# Run from ~/Hourly on the VPS (after Caddy is configured for hourly.samimreza.me)

set -euo pipefail

ROOT="$(cd "$(dirname "$0")" && pwd)"
cd "$ROOT"

echo "==> Hourly deploy ($(pwd))"

if [[ ! -f .env ]]; then
  echo "Error: .env missing. Copy .env.example to .env and set Supabase keys."
  exit 1
fi

if ! docker network inspect web >/dev/null 2>&1; then
  echo "==> Creating Docker network: web"
  docker network create web
fi

echo "==> git pull"
git pull

echo "==> docker compose up -d --build"
docker compose up -d --build

echo "==> Deployed. Container status:"
docker compose ps

echo ""
echo "==> docker compose logs -f hourly-app"
echo "    (Ctrl+C stops following logs; container keeps running)"
echo ""
docker compose logs -f hourly-app
