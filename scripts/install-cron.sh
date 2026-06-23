#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
CRON_SCRIPT="$PROJECT_DIR/scripts/cron-data-sync.sh"
CRON_LOG="/var/log/spacex-data-sync.log"
CRON_LINE="0 3 * * * $CRON_SCRIPT"

if [ ! -f "$CRON_SCRIPT" ]; then
  echo "Cron script not found: $CRON_SCRIPT"
  exit 1
fi

mkdir -p "$(dirname "$CRON_LOG")"
chmod +x "$CRON_SCRIPT"

CURRENT_CRONTAB=$(crontab -l 2>/dev/null || true)
if echo "$CURRENT_CRONTAB" | grep -Fq "$CRON_SCRIPT"; then
  echo "Cron job already installed for $CRON_SCRIPT"
else
  echo "$CURRENT_CRONTAB" | { cat; echo "$CRON_LINE"; } | crontab -
  echo "Installed cron job: $CRON_LINE"
fi
