#!/bin/bash
# Daily BrickLink price backfill, run by launchd (see install-daily-backfill.sh).
# Prices the next batch of sets, then commits and pushes data/sets.json.
set -u
cd "$(dirname "$0")/.." || exit 1
echo "=== $(date) ==="

notify() { osascript -e "display notification \"$1\" with title \"BrickValue prices\"" >/dev/null 2>&1 || true; }

if ! git pull --ff-only --quiet; then
  echo "git pull failed (local changes or diverged branch) — skipping today."
  notify "Daily price update skipped: git pull failed. See the log."
  exit 1
fi

node scripts/backfill-bricklink-prices.mjs --include-manual
status=$?

git add data/sets.json
if git diff --cached --quiet; then
  echo "No price changes to commit."
else
  git commit --quiet -m "BrickLink price backfill" && git push --quiet && echo "Pushed." \
    || { echo "Commit or push failed."; notify "Prices updated but push failed. See the log."; exit 1; }
fi

[ $status -eq 0 ] && notify "Daily price update done." || notify "Price update stopped early — it'll continue tomorrow."
