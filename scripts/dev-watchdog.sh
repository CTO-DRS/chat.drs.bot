#!/bin/bash
# Watchdog: keeps the Next.js dev server alive in constrained-memory sandboxes.
# If the server dies (e.g. OOM during heavy compiles), restart it and wait
# until the port responds again.

PROJECT_DIR="/home/z/my-project"
LOG="$PROJECT_DIR/.zscripts/watchdog.log"

log() {
  echo "[$(date '+%Y-%m-%d %H:%M:%S')] $*" >> "$LOG"
}

ping_ok() {
  curl -s -o /dev/null --max-time 4 "http://localhost:3000/ping"
}

start_server() {
  log "Starting dev server via dev.sh"
  setsid nohup bash "$PROJECT_DIR/.zscripts/dev.sh" \
    > "$PROJECT_DIR/.zscripts/dev-launch.log" 2>&1 < /dev/null &

  # Wait for dev.sh to fully finish so its cleanup trap doesn't kill next dev.
  for _ in $(seq 1 40); do
    sleep 5
    if grep -q "running in background" "$PROJECT_DIR/.zscripts/dev-launch.log" 2>/dev/null; then
      break
    fi
  done
}

log "Watchdog started"
while true; do
  if ! ping_ok; then
    log "Server down — restarting"
    pkill -f "next dev" 2>/dev/null
    pkill -f "next-server" 2>/dev/null
    sleep 2
    start_server
    if ping_ok; then
      log "Server recovered"
    else
      log "Server still not responding after restart attempt"
    fi
  fi
  sleep 15
done
