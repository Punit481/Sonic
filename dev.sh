#!/usr/bin/env bash
# Starts Sonic locally: database, backend and frontend in one terminal. Ctrl + C stops everything.
#
#   ./dev.sh             start, and open the app in your browser
#   ./dev.sh --no-open   start without opening the browser
#
# Also backs up the database once a day (see scripts/backup.sh).
set -euo pipefail

ROOT="$(cd "$(dirname "$0")" && pwd)"
cd "$ROOT"

bold=$'\033[1m'; dim=$'\033[2m'; red=$'\033[31m'; green=$'\033[32m'; cyan=$'\033[36m'; magenta=$'\033[35m'; reset=$'\033[0m'
say() { echo "${bold}▸${reset} $*"; }
fail() { echo "${red}✗ $*${reset}" >&2; exit 1; }

# 1. Docker, for the database
if ! docker info > /dev/null 2>&1; then
  say "Starting Docker Desktop…"
  open -a Docker 2> /dev/null || fail "Docker isn't installed. Get Docker Desktop from docker.com."
  for _ in $(seq 1 90); do docker info > /dev/null 2>&1 && break; sleep 2; done
  docker info > /dev/null 2>&1 || fail "Docker didn't start. Open Docker Desktop and try again."
fi

# 2. Settings (checked without printing any secrets)
[[ -f backend/.env ]] || fail "backend/.env is missing. Copy backend/.env.example to backend/.env and fill it in."
[[ -f frontend/.env ]] || fail "frontend/.env is missing. Copy frontend/.env.example to frontend/.env and fill it in."
has() { grep -Eq "^$1=.+" "$2" && ! grep -Eq "^$1=(your|https://your-)" "$2"; }
has CLERK_ISSUER backend/.env || fail "Set CLERK_ISSUER in backend/.env (see README)."
has VITE_CLERK_PUBLISHABLE_KEY frontend/.env || fail "Set VITE_CLERK_PUBLISHABLE_KEY in frontend/.env (see README)."
has GROQ_API_KEY backend/.env || echo "${red}!${reset} GROQ_API_KEY isn't set in backend/.env: the app runs, but voice logging and insights won't work."

# 3. Ports
for port in 8080 5173; do
  if lsof -iTCP:$port -sTCP:LISTEN > /dev/null 2>&1; then
    fail "Port $port is already in use. Is Sonic already running in another terminal?"
  fi
done

# 4. Frontend dependencies, first run only
if [[ ! -d frontend/node_modules ]]; then
  say "Installing frontend dependencies (first run only)…"
  (cd frontend && npm install --silent)
fi

# 5. Database, and today's backup
say "Starting the database…"
docker compose -f backend/compose.yaml up -d postgres > /dev/null 2>&1
scripts/backup.sh --if-stale | sed "s/^/${dim}/;s/$/${reset}/" || echo "${red}!${reset} Backup failed; Sonic will still start."

# 6. Backend and frontend, with labelled output. Ctrl + C stops both.
# Each runs as a tree (mvnw -> Maven -> the app's JVM; npm -> vite), so stop whole trees.
pids=()
kill_tree() {
  local child
  for child in $(pgrep -P "$1" 2> /dev/null); do kill_tree "$child"; done
  kill -TERM "$1" 2> /dev/null || true
}
cleanup() {
  trap - INT TERM EXIT
  echo
  say "Stopping Sonic…"
  for pid in "${pids[@]}"; do kill_tree "$pid"; done
  wait 2> /dev/null || true
  say "Stopped. ${dim}(The database keeps running in Docker; it's tiny.)${reset}"
}
trap 'cleanup; exit 0' INT TERM
trap cleanup EXIT

say "Starting the backend and frontend…"
(cd backend && ./mvnw -q spring-boot:run 2>&1 | sed -l "s/^/${cyan}api │${reset} /") &
pids+=($!)
(cd frontend && npm run dev -- --clearScreen false 2>&1 | sed -l "s/^/${magenta}web │${reset} /") &
pids+=($!)

for _ in $(seq 1 120); do
  curl -s localhost:8080/actuator/health 2> /dev/null | grep -q UP && break
  sleep 1
done
if curl -s localhost:8080/actuator/health 2> /dev/null | grep -q UP; then
  echo
  echo "${green}${bold}✓ Sonic is running:${reset} ${bold}http://localhost:5173${reset}   ${dim}(Ctrl + C to stop)${reset}"
  echo
  [[ "${1:-}" == "--no-open" ]] || open http://localhost:5173 2> /dev/null || true
else
  echo "${red}!${reset} The backend hasn't started after 2 minutes. Check the ${cyan}api │${reset} lines above for the error."
fi

wait
