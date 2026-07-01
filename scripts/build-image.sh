#!/usr/bin/env bash
# Build Hourly dashboard image on your PC (needs ~2GB RAM free).
# Then copy hourly-app.tar to the VPS and run: ./deploy.sh --load-image
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"
OUT="${ROOT}/hourly-app.tar"

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

if [[ ! -f .env ]]; then
  echo "Error: .env missing"
  exit 1
fi

load_env
export NEXT_PUBLIC_SUPABASE_URL="${NEXT_PUBLIC_SUPABASE_URL:-${SUPABASE_URL:-}}"
export NEXT_PUBLIC_SUPABASE_ANON_KEY="${NEXT_PUBLIC_SUPABASE_ANON_KEY:-${SUPABASE_PUBLISHABLE_KEY:-}}"

if [[ -z "$NEXT_PUBLIC_SUPABASE_URL" || -z "$NEXT_PUBLIC_SUPABASE_ANON_KEY" ]]; then
  echo "Error: Supabase keys missing in .env"
  exit 1
fi

echo "==> Building hourly-app:latest (this needs RAM — run on your Ubuntu PC, not the VPS)"
export DOCKER_BUILDKIT=1

docker build \
  --build-arg NEXT_PUBLIC_SUPABASE_URL="$NEXT_PUBLIC_SUPABASE_URL" \
  --build-arg NEXT_PUBLIC_SUPABASE_ANON_KEY="$NEXT_PUBLIC_SUPABASE_ANON_KEY" \
  -t hourly-app:latest \
  -f Dockerfile \
  .

echo "==> Saving image to ${OUT}"
docker save hourly-app:latest -o "$OUT"
ls -lh "$OUT"

echo ""
echo "Copy to VPS:"
echo "  scp hourly-app.tar user@your-vps:~/Hourly/"
echo "On VPS:"
echo "  cd ~/Hourly && ./deploy.sh --load-image"
