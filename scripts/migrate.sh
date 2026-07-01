#!/usr/bin/env bash
# Try multiple Supabase connection formats until one works.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

set -a
# shellcheck disable=SC1091
source .env
set +a

REF="${SUPABASE_PROJECT_REF}"
PASS="${SUPABASE_DB_PASSWORD}"
ENC_PASS=$(python3 -c "import urllib.parse; print(urllib.parse.quote('''$PASS''', safe=''))")

URLS=(
  "postgresql://postgres.${REF}:${ENC_PASS}@aws-1-${SUPABASE_POOLER_HOST:-ap-southeast-1}.pooler.supabase.com:6543/postgres"
  "postgresql://postgres.${REF}:${ENC_PASS}@aws-0-${SUPABASE_POOLER_HOST:-ap-southeast-1}.pooler.supabase.com:6543/postgres"
  "postgresql://postgres:${ENC_PASS}@db.${REF}.supabase.co:5432/postgres"
  "postgresql://postgres.${REF}:${ENC_PASS}@db.${REF}.supabase.co:5432/postgres"
)

for url in "${URLS[@]}"; do
  echo "Trying connection..."
  if psql "$url" -v ON_ERROR_STOP=1 -c "SELECT 1" >/dev/null 2>&1; then
    echo "Connected."
    echo "Running 001_initial_schema.sql..."
    psql "$url" -v ON_ERROR_STOP=1 -f supabase/migrations/001_initial_schema.sql
    echo "Running 002_storage.sql..."
    psql "$url" -v ON_ERROR_STOP=1 -f supabase/migrations/002_storage.sql
    echo "Migrations complete."
    exit 0
  fi
done

echo "Could not connect. Run migrations manually in Supabase SQL Editor:"
echo "  https://supabase.com/dashboard/project/${REF}/sql"
exit 1
