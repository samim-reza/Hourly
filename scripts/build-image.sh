#!/usr/bin/env bash
# Build Hourly dashboard image on your PC (needs ~2GB RAM free).
# Then copy hourly-app.tar to the VPS and run: ./deploy.sh --load-image
#
# Do NOT use sudo — add your user to docker: sudo usermod -aG docker $USER
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"
OUT="${ROOT}/hourly-app.tar"

if [[ -n "${SUDO_USER:-}" ]]; then
  echo "Warning: running via sudo — image will be saved to /tmp first."
  OWNER="${SUDO_USER}:${SUDO_USER}"
else
  OWNER=""
fi

if ! docker info >/dev/null 2>&1; then
  echo "Error: cannot access Docker."
  echo "  Fix: sudo usermod -aG docker \$USER && newgrp docker"
  echo "  Do not run this script with sudo."
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

echo "==> Building hourly-app:latest"
export DOCKER_BUILDKIT=1

docker build \
  --build-arg NEXT_PUBLIC_SUPABASE_URL="$NEXT_PUBLIC_SUPABASE_URL" \
  --build-arg NEXT_PUBLIC_SUPABASE_ANON_KEY="$NEXT_PUBLIC_SUPABASE_ANON_KEY" \
  -t hourly-app:latest \
  -f Dockerfile \
  .

TMP_OUT="${ROOT}/.hourly-app-save-$$.tar"
echo "==> Saving image to ${OUT}"
if ! docker save hourly-app:latest > "$TMP_OUT"; then
  echo "Error: docker save failed"
  exit 1
fi
if [[ ! -s "$TMP_OUT" ]]; then
  echo "Error: docker save produced an empty file"
  exit 1
fi
mv -f "$TMP_OUT" "$OUT"
[[ -n "$OWNER" ]] && chown "$OWNER" "$OUT"
chmod 644 "$OUT"
ls -lh "$OUT"

echo ""
echo "Copy to VPS:"
echo "  scp ${OUT} root@165.22.3.200:~/Hourly/"
echo "On VPS:"
echo "  cd ~/Hourly && ./deploy.sh --load-image"
