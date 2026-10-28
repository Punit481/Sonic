#!/usr/bin/env bash
# Replaces Sonic's database with a backup.
#
#   scripts/restore.sh                         restore the newest backup
#   scripts/restore.sh ~/Sonic-backups/sonic-2026-10-28_090000.sql.gz
#
# Takes a safety backup of the current data first. Stop the backend before restoring.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
COMPOSE=(docker compose -f "$ROOT/backend/compose.yaml")
BACKUP_DIR="${SONIC_BACKUP_DIR:-$HOME/Sonic-backups}"

file="${1:-$(ls -1t "$BACKUP_DIR"/sonic-*.sql.gz 2> /dev/null | head -1 || true)}"
if [[ -z "$file" || ! -f "$file" ]]; then
  echo "No backup found${1:+ at $1}. Backups live in $BACKUP_DIR." >&2
  exit 1
fi
gzip -t "$file" || { echo "$file is damaged; pick another backup." >&2; exit 1; }

if lsof -iTCP:8080 -sTCP:LISTEN > /dev/null 2>&1; then
  echo "The backend is running on port 8080. Stop it (Ctrl + C) and run this again." >&2
  exit 1
fi

echo "This replaces ALL current Sonic data with:"
echo "  $file"
read -r -p "Type 'restore' to continue: " answer
[[ "$answer" == "restore" ]] || { echo "Cancelled."; exit 1; }

echo "Saving a safety backup of the current data first..."
"$ROOT/scripts/backup.sh"

gunzip -c "$file" | "${COMPOSE[@]}" exec -T postgres psql -U sonic -d sonic -v ON_ERROR_STOP=1 --single-transaction -q > /dev/null
echo "Restored. Start Sonic again with ./dev.sh"
