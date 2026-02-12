#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$ROOT_DIR"

MODE="${1:-dev}"
PORT="${PORT:-3000}"
RUN_DIR="$ROOT_DIR/.run"
PID_FILE="$RUN_DIR/opengroundnews-${MODE}.pid"
LOG_FILE="$RUN_DIR/opengroundnews-${MODE}.log"

mkdir -p "$RUN_DIR"

load_dotenv() {
  local env_file="$1"
  if [[ -f "$env_file" ]]; then
    # .env files are generally POSIX-style KEY=VALUE, which bash can source.
    # We avoid printing values to logs (may contain secrets).
    set -a
    # shellcheck disable=SC1090
    source "$env_file"
    set +a
  fi
}

ensure_local_postgres() {
  local pg_port="${OGN_PG_PORT:-54329}"
  local pg_db="${OGN_PG_DB:-ogn_dev}"
  local pg_data_dir="$ROOT_DIR/output/local-postgres/data"
  local pg_log_file="$ROOT_DIR/output/local-postgres/logfile"
  local pg_user
  pg_user="$(id -un)"

  mkdir -p "$(dirname "$pg_data_dir")"
  mkdir -p "$(dirname "$pg_log_file")"

  if ! command -v pg_ctl >/dev/null 2>&1 || ! command -v initdb >/dev/null 2>&1; then
    echo "Postgres tools not found (pg_ctl/initdb). Install Postgres (e.g. via Homebrew) or set DATABASE_URL in .env.local."
    return 1
  fi

  if [[ ! -f "$pg_data_dir/PG_VERSION" ]]; then
    echo "Initializing local Postgres cluster at $pg_data_dir"
    initdb -D "$pg_data_dir" >/dev/null
  fi

  if ! pg_ctl -D "$pg_data_dir" status >/dev/null 2>&1; then
    echo "Starting local Postgres on port $pg_port"
    pg_ctl -D "$pg_data_dir" -o "-p $pg_port" -l "$pg_log_file" start >/dev/null
  fi

  # Wait for readiness.
  if command -v pg_isready >/dev/null 2>&1; then
    for _ in {1..50}; do
      if pg_isready -p "$pg_port" >/dev/null 2>&1; then
        break
      fi
      sleep 0.1
    done
  else
    sleep 0.5
  fi

  # Ensure the dev database exists.
  if command -v createdb >/dev/null 2>&1; then
    createdb -p "$pg_port" "$pg_db" >/dev/null 2>&1 || true
  fi

  export DATABASE_URL="postgresql://${pg_user}@localhost:${pg_port}/${pg_db}?schema=public"
  return 0
}

ensure_database_url() {
  if [[ -n "${DATABASE_URL:-}" ]]; then
    return 0
  fi
  if [[ "$MODE" == "prod" ]]; then
    echo "DATABASE_URL is required for prod. Set it in the environment or in .env.local."
    return 1
  fi
  ensure_local_postgres
}

usage() {
  cat <<'USAGE'
Usage:
  ./restart.sh [dev|prod]

Environment:
  PORT=<port>            # default: 3000
  DATABASE_URL=<url>     # required for prod; auto-provisioned for dev if missing
  OGN_PG_PORT=<port>     # default: 54329 (dev auto DB)
  OGN_PG_DB=<name>       # default: ogn_dev (dev auto DB)
USAGE
}

stop_pid() {
  local pid="$1"
  if ! kill -0 "$pid" >/dev/null 2>&1; then
    return 0
  fi

  kill "$pid" >/dev/null 2>&1 || true
  for _ in {1..20}; do
    if ! kill -0 "$pid" >/dev/null 2>&1; then
      return 0
    fi
    sleep 0.25
  done
  kill -9 "$pid" >/dev/null 2>&1 || true
}

if [[ "$MODE" != "dev" && "$MODE" != "prod" ]]; then
  usage
  exit 1
fi

if [[ -f "$PID_FILE" ]]; then
  OLD_PID="$(cat "$PID_FILE" 2>/dev/null || true)"
  if [[ -n "${OLD_PID:-}" ]]; then
    echo "Stopping previous OpenGroundNews PID: $OLD_PID"
    stop_pid "$OLD_PID"
  fi
  rm -f "$PID_FILE"
fi

# Load .env for shell-side commands (Prisma, scripts) and to pass env through to Next.
load_dotenv "$ROOT_DIR/.env"
load_dotenv "$ROOT_DIR/.env.local"

if ! ensure_database_url; then
  exit 1
fi

echo "Ensuring Prisma client + migrations are up to date..."
npm run db:generate >/dev/null 2>&1 || true
npm run db:deploy >/dev/null

if [[ -z "${DATABASE_URL:-}" ]]; then
  echo "DATABASE_URL still missing after preflight; refusing to start."
  exit 1
fi

# If Next.js dev lock exists, stop the process holding it (if any).
LOCK_FILE="$ROOT_DIR/.next/dev/lock"
if [[ -f "$LOCK_FILE" ]] && command -v lsof >/dev/null 2>&1; then
  LOCK_PIDS="$(lsof -t "$LOCK_FILE" 2>/dev/null || true)"
  for pid in $LOCK_PIDS; do
    echo "Stopping process holding Next.js dev lock (PID: $pid)"
    stop_pid "$pid"
  done
fi

# If the port is occupied by a Next.js process, stop it to ensure clean restart.
if command -v lsof >/dev/null 2>&1; then
  PORT_PIDS="$(lsof -tiTCP:"$PORT" -sTCP:LISTEN 2>/dev/null || true)"
  for pid in $PORT_PIDS; do
    cmd="$(ps -p "$pid" -o command= 2>/dev/null || true)"
    if [[ "$cmd" == *"next-server"* || "$cmd" == *"next dev"* || "$cmd" == *"next start"* ]]; then
      echo "Stopping Next.js listener on port $PORT (PID: $pid)"
      stop_pid "$pid"
    fi
  done
fi

if [[ "$MODE" == "prod" ]]; then
  echo "Building production bundle..."
  npm run build >/dev/null
  START_CMD=(env DATABASE_URL="$DATABASE_URL" npm run start -- --port "$PORT")
else
  START_CMD=(env DATABASE_URL="$DATABASE_URL" npm run dev -- --port "$PORT")
fi

echo "Starting OpenGroundNews in $MODE mode on port $PORT"
: > "$LOG_FILE"
nohup "${START_CMD[@]}" >>"$LOG_FILE" 2>&1 &
NEW_PID="$!"
echo "$NEW_PID" > "$PID_FILE"

sleep 1
if ! kill -0 "$NEW_PID" >/dev/null 2>&1; then
  rm -f "$PID_FILE"
  echo "Failed to start process. Last log lines:"
  tail -n 80 "$LOG_FILE" || true
  exit 1
fi

# Wait briefly for startup errors such as lock conflicts.
sleep 2
if ! kill -0 "$NEW_PID" >/dev/null 2>&1; then
  rm -f "$PID_FILE"
  echo "Process exited during startup. Last log lines:"
  tail -n 80 "$LOG_FILE" || true
  exit 1
fi
if grep -q "Unable to acquire lock" "$LOG_FILE"; then
  stop_pid "$NEW_PID"
  rm -f "$PID_FILE"
  echo "Startup failed due to Next.js lock conflict. Last log lines:"
  tail -n 80 "$LOG_FILE" || true
  exit 1
fi

echo "Restart complete."
echo "PID: $NEW_PID"
echo "Log: $LOG_FILE"
