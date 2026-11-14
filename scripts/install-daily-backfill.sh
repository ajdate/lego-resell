#!/bin/bash
# Installs (or removes, with --uninstall) the nightly price backfill on this Mac.
#   bash scripts/install-daily-backfill.sh
#   bash scripts/install-daily-backfill.sh --uninstall
set -e
LABEL="app.brickvalue.price-backfill"
PLIST="$HOME/Library/LaunchAgents/$LABEL.plist"
LOG="$HOME/Library/Logs/brickvalue-price-backfill.log"
REPO="$(cd "$(dirname "$0")/.." && pwd)"

launchctl bootout "gui/$(id -u)/$LABEL" 2>/dev/null || true
if [ "${1:-}" = "--uninstall" ]; then
  rm -f "$PLIST"
  echo "Nightly price backfill removed."
  exit 0
fi

NODE="$(command -v node || true)"
if [ -z "$NODE" ]; then echo "Can't find node — run this from the Terminal you normally use."; exit 1; fi

mkdir -p "$HOME/Library/LaunchAgents" "$HOME/Library/Logs"
cat > "$PLIST" <<PLIST
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>Label</key><string>$LABEL</string>
  <key>ProgramArguments</key>
  <array><string>/bin/bash</string><string>$REPO/scripts/daily-backfill.sh</string></array>
  <key>EnvironmentVariables</key>
  <dict><key>PATH</key><string>$(dirname "$NODE"):/usr/local/bin:/usr/bin:/bin</string></dict>
  <key>StartCalendarInterval</key>
  <dict><key>Hour</key><integer>20</integer><key>Minute</key><integer>17</integer></dict>
  <key>StandardOutPath</key><string>$LOG</string>
  <key>StandardErrorPath</key><string>$LOG</string>
</dict>
</plist>
PLIST

launchctl bootstrap "gui/$(id -u)" "$PLIST"
echo "Installed: prices update every evening at 8:17pm (or when the Mac next wakes)."
echo "Project: $REPO"
echo "Log:     $LOG"
echo "Run now: launchctl kickstart gui/$(id -u)/$LABEL"
