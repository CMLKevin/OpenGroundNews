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

usage() {
  cat <<'USAGE'
Usage:
  ./restart.sh [dev|prod]

Environment:
  PORT=<port>            # default: 3000
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
  START_CMD=(npm run start -- --port "$PORT")
else
  START_CMD=(npm run dev -- --port "$PORT")
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
