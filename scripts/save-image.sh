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

validate_tar() {
  local f="$1"
  if [[ ! -s "$f" ]]; then
    echo "Error: archive is empty"
    return 1
  fi
  # Reject text/corrupt files (e.g. warnings captured in redirect)
  if head -c 64 "$f" | grep -qE '^(Error|WARN|WARNING|permission|docker:)'; then
    echo "Error: archive contains text, not image data:"
    head -3 "$f"
    return 1
  fi
  if tar tf "$f" manifest.json &>/dev/null; then
    return 0
  fi
  echo "Error: missing manifest.json — use docker-archive format (re-run this script)"
  file "$f"
  return 1
}

if ! docker_cmd image inspect hourly-app:latest >/dev/null 2>&1; then
  echo "Error: image 'hourly-app:latest' not found."
  echo "Build first: ./scripts/build-image.sh"
  exit 1
fi

echo "==> Saving hourly-app:latest → ${OUT}"
# docker-archive = compatible with older VPS Docker; stderr must not pollute stdout
if ! docker_cmd save --format docker-archive hourly-app:latest > "$TMP" 2>/dev/null; then
  echo "Trying without --format flag..."
  if ! docker_cmd save hourly-app:latest > "$TMP" 2>/dev/null; then
    echo "Error: docker save failed"
    exit 1
  fi
fi

if ! validate_tar "$TMP"; then
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
echo "SHA256: $(sha256sum "$OUT" | awk '{print $1}')"
echo ""
echo "Copy to VPS:"
echo "  scp ${OUT} root@165.22.3.200:~/Hourly/"
echo "On VPS verify size/checksum matches, then:"
echo "  ./deploy.sh --load-image"
