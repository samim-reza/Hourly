#!/usr/bin/env bash
# Hourly VPS deploy
#
# RECOMMENDED (512MB VPS): build on your PC, copy image, load on VPS
#   ./scripts/build-image.sh
#   scp hourly-app.tar user@vps:~/Hourly/
#   ./deploy.sh --load-image
#
# NOT recommended on low-RAM VPS:
#   ./deploy.sh            # compiles Next.js inside Docker (needs ~1–2GB peak)

set -euo pipefail

ROOT="$(cd "$(dirname "$0")" && pwd)"
cd "$ROOT"

LOAD_IMAGE=0
SKIP_GIT_PULL=0

for arg in "$@"; do
  case "$arg" in
    --load-image) LOAD_IMAGE=1 ;;
    --no-pull) SKIP_GIT_PULL=1 ;;
    --help|-h)
      echo "Usage: ./deploy.sh [--load-image] [--no-pull]"
      echo "  --load-image  Load hourly-app.tar and start (no compile on VPS)"
      echo "  --no-pull     Skip git pull"
      exit 0
      ;;
  esac
done

echo "==> Hourly deploy ($(pwd))"

if [[ ! -f .env ]]; then
  echo "Error: .env missing. Copy .env.example to .env and set Supabase keys."
  exit 1
fi

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

export NEXT_PUBLIC_SUPABASE_URL="${NEXT_PUBLIC_SUPABASE_URL:-${SUPABASE_URL:-}}"
export NEXT_PUBLIC_SUPABASE_ANON_KEY="${NEXT_PUBLIC_SUPABASE_ANON_KEY:-${SUPABASE_PUBLISHABLE_KEY:-}}"

if [[ -z "$NEXT_PUBLIC_SUPABASE_URL" || -z "$NEXT_PUBLIC_SUPABASE_ANON_KEY" ]]; then
  echo "Error: Supabase keys missing in .env"
  exit 1
fi

echo "==> Supabase URL: ${NEXT_PUBLIC_SUPABASE_URL}"

if ! docker network inspect web >/dev/null 2>&1; then
  echo "==> Creating Docker network: web"
  docker network create web
fi

if [[ $SKIP_GIT_PULL -eq 0 ]]; then
  echo "==> git pull"
  git pull
fi

if [[ $LOAD_IMAGE -eq 1 ]]; then
  if [[ ! -f hourly-app.tar ]]; then
    echo "Error: hourly-app.tar not found. Run ./scripts/build-image.sh on your PC first."
    exit 1
  fi
  echo "==> docker load -i hourly-app.tar"
  docker load -i hourly-app.tar
  echo "==> docker compose -f docker-compose.prod.yml up -d"
  docker compose -f docker-compose.prod.yml up -d
else
  FREE_MB=$(free -m 2>/dev/null | awk '/^Mem:/{print $7}' || echo 0)
  if [[ "$FREE_MB" -gt 0 && "$FREE_MB" -lt 512 ]]; then
    echo ""
    echo "ERROR: Only ${FREE_MB}MB RAM available. Docker build will hang or OOM."
    echo ""
    echo "Your chatbot runs fine because it is already BUILT — it just starts Python."
    echo "This dashboard must COMPILE Next.js during 'docker compose build' (~1–2GB peak)."
    echo ""
    echo "Fix — build on your Ubuntu PC, not the VPS:"
    echo "  ./scripts/build-image.sh"
    echo "  scp hourly-app.tar user@this-vps:~/Hourly/"
    echo "  ./deploy.sh --load-image"
    echo ""
    exit 1
  fi

  echo "==> docker compose up -d --build (slow on small VPS — prefer --load-image)"
  export DOCKER_BUILDKIT=1
  export COMPOSE_DOCKER_CLI_BUILD=1
  docker compose up -d --build
fi

echo "==> Container status:"
docker compose -f docker-compose.yml ps 2>/dev/null || docker compose -f docker-compose.prod.yml ps

echo ""
echo "==> docker compose logs -f (Ctrl+C to stop following)"
docker compose -f docker-compose.prod.yml logs -f hourly-app 2>/dev/null \
  || docker compose -f docker-compose.yml logs -f hourly-app
