#!/usr/bin/env bash
set -euo pipefail

LOG_FILE=/var/log/spacex-data-sync.log
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$SCRIPT_DIR/.."

echo "[$(date -u +'%Y-%m-%dT%H:%M:%SZ')] cron-data-sync start" >> "$LOG_FILE"

if /usr/bin/npm run data:sync >> "$LOG_FILE" 2>&1; then
  :
else
  code=$?
  echo "[$(date -u +'%Y-%m-%dT%H:%M:%SZ')] cron-data-sync FAILED during data:sync (exit=$code)" >> "$LOG_FILE"
  exit "$code"
fi

echo "[$(date -u +'%Y-%m-%dT%H:%M:%SZ')] cron-data-sync data updated, rebuilding app" >> "$LOG_FILE"
if /usr/bin/npm run build >> "$LOG_FILE" 2>&1; then
  :
else
  code=$?
  echo "[$(date -u +'%Y-%m-%dT%H:%M:%SZ')] cron-data-sync FAILED during build (exit=$code)" >> "$LOG_FILE"
  exit "$code"
fi

echo "[$(date -u +'%Y-%m-%dT%H:%M:%SZ')] cron-data-sync build complete, restarting pm2 spacex-demo" >> "$LOG_FILE"
PM2_BIN="$(command -v pm2 || true)"
if [ -z "$PM2_BIN" ]; then
  echo "[$(date -u +'%Y-%m-%dT%H:%M:%SZ')] cron-data-sync FAILED: pm2 binary not found in PATH" >> "$LOG_FILE"
  exit 127
fi
if "$PM2_BIN" restart spacex-demo >> "$LOG_FILE" 2>&1; then
  :
else
  code=$?
  echo "[$(date -u +'%Y-%m-%dT%H:%M:%SZ')] cron-data-sync FAILED during pm2 restart (exit=$code)" >> "$LOG_FILE"
  exit "$code"
fi

echo "[$(date -u +'%Y-%m-%dT%H:%M:%SZ')] cron-data-sync success" >> "$LOG_FILE"
