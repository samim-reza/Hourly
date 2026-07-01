#!/usr/bin/env bash
# Hourly VPS deploy — pull, rebuild, start, show logs
# Usage: ./deploy.sh

set -euo pipefail

ROOT="$(cd "$(dirname "$0")" && pwd)"
cd "$ROOT"

echo "==> Hourly deploy ($(pwd))"

if [[ ! -f .env ]]; then
  echo "Error: .env missing. Copy .env.example to .env and set Supabase keys."
  exit 1
fi

# Load .env safely (handles special chars in values)
load_env() {
  local key value
  while IFS= read -r line || [[ -n "$line" ]]; do
    [[ "$line" =~ ^[[:space:]]*# ]] && continue
    [[ -z "${line// }" ]] && continue
    key="${line%%=*}"
    value="${line#*=}"
    key="${key#"${key%%[![:space:]]*}"}"
    key="${key%"${key##*[![:space:]]}"}"
    export "$key=$value"
  done < .env
}

load_env

# Map SUPABASE_* names → NEXT_PUBLIC_* (required for docker compose build args)
export NEXT_PUBLIC_SUPABASE_URL="${NEXT_PUBLIC_SUPABASE_URL:-${SUPABASE_URL:-}}"
export NEXT_PUBLIC_SUPABASE_ANON_KEY="${NEXT_PUBLIC_SUPABASE_ANON_KEY:-${SUPABASE_PUBLISHABLE_KEY:-}}"

if [[ -z "$NEXT_PUBLIC_SUPABASE_URL" || -z "$NEXT_PUBLIC_SUPABASE_ANON_KEY" ]]; then
  echo "Error: Supabase keys missing in .env"
  echo "  Set NEXT_PUBLIC_SUPABASE_URL + NEXT_PUBLIC_SUPABASE_ANON_KEY"
  echo "  OR SUPABASE_URL + SUPABASE_PUBLISHABLE_KEY"
  exit 1
fi

echo "==> Supabase URL: ${NEXT_PUBLIC_SUPABASE_URL}"
echo "==> Anon key: ${NEXT_PUBLIC_SUPABASE_ANON_KEY:0:12}..."

if ! docker network inspect web >/dev/null 2>&1; then
  echo "==> Creating Docker network: web"
  docker network create web
fi

echo "==> git pull"
git pull

echo "==> docker compose up -d --build"
export DOCKER_BUILDKIT=1
export COMPOSE_DOCKER_CLI_BUILD=1
docker compose up -d --build

echo "==> Deployed. Container status:"
docker compose ps

echo ""
echo "==> docker compose logs -f hourly-app"
echo "    (Ctrl+C stops following logs; container keeps running)"
echo ""
docker compose logs -f hourly-app
