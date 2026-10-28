#!/usr/bin/env bash
# Saves a compressed copy of Sonic's database.
#
#   scripts/backup.sh               back up now
#   scripts/backup.sh --if-stale    only if there's no backup from today (dev.sh uses this)
#
# Backups go to $SONIC_BACKUP_DIR (default ~/Sonic-backups); the newest $SONIC_BACKUP_KEEP
# (default 30) are kept. Point SONIC_BACKUP_DIR at an iCloud or Google Drive folder to keep a
# copy off this machine.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
COMPOSE=(docker compose -f "$ROOT/backend/compose.yaml")
BACKUP_DIR="${SONIC_BACKUP_DIR:-$HOME/Sonic-backups}"
KEEP="${SONIC_BACKUP_KEEP:-30}"

if [[ "${1:-}" == "--if-stale" ]] && compgen -G "$BACKUP_DIR/sonic-$(date +%Y-%m-%d)_*.sql.gz" > /dev/null; then
  exit 0
fi

if ! docker info > /dev/null 2>&1; then
  echo "Docker isn't running. Start Docker Desktop, then try again." >&2
  exit 1
fi

# The database container must be up; start it if it isn't.
"${COMPOSE[@]}" up -d --quiet-pull postgres > /dev/null 2>&1
for _ in $(seq 1 30); do
  "${COMPOSE[@]}" exec -T postgres pg_isready -U sonic -d sonic > /dev/null 2>&1 && break
  sleep 1
done

mkdir -p "$BACKUP_DIR"
file="$BACKUP_DIR/sonic-$(date +%Y-%m-%d_%H%M%S).sql.gz"

# --clean/--if-exists makes the file restore over an existing database.
"${COMPOSE[@]}" exec -T postgres pg_dump -U sonic -d sonic --clean --if-exists --no-owner | gzip > "$file.partial"
gzip -t "$file.partial"
mv "$file.partial" "$file"

# Keep the newest $KEEP backups.
ls -1t "$BACKUP_DIR"/sonic-*.sql.gz | tail -n +$((KEEP + 1)) | while read -r old; do rm -f "$old"; done

echo "Backed up to $file ($(du -h "$file" | cut -f1))"
