#!/usr/bin/env bash
# Save already-built hourly-app:latest to hourly-app.tar
# Usage: ./scripts/save-image.sh   (or: sudo ./scripts/save-image.sh)
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
OUT="${ROOT}/hourly-app.tar"
TMP="${ROOT}/.hourly-app-save-$$.tar"

cleanup() { rm -f "$TMP"; }
trap cleanup EXIT

docker_cmd() {
  if docker info >/dev/null 2>&1; then
    docker "$@"
  elif sudo docker info >/dev/null 2>&1; then
    sudo docker "$@"
  else
    echo "Error: cannot access Docker. Try: sudo usermod -aG docker \$USER && newgrp docker"
    exit 1
  fi
}

if ! docker_cmd image inspect hourly-app:latest >/dev/null 2>&1; then
  echo "Error: image 'hourly-app:latest' not found."
  echo "Build first: ./scripts/build-image.sh"
  exit 1
fi

echo "==> Saving hourly-app:latest → ${OUT}"
# Snap Docker often fails with -o; stdout redirect works reliably
if ! docker_cmd save hourly-app:latest > "$TMP"; then
  echo "Error: docker save failed"
  exit 1
fi

if [[ ! -s "$TMP" ]]; then
  echo "Error: docker save produced an empty file"
  exit 1
fi

mv -f "$TMP" "$OUT"
trap - EXIT

if [[ -n "${SUDO_USER:-}" && -f "$OUT" ]]; then
  chown "${SUDO_USER}:$(id -gn "$SUDO_USER" 2>/dev/null || echo "$SUDO_USER")" "$OUT" 2>/dev/null \
    || chown "$SUDO_USER" "$OUT"
fi

chmod 644 "$OUT"
ls -lh "$OUT"
echo ""
echo "Copy to VPS:"
echo "  scp ${OUT} root@165.22.3.200:~/Hourly/"
