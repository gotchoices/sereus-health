#!/usr/bin/env bash
# screen-timings.sh — open health's main screens one at a time by deep link and total the
# database queries each one runs (from the dev-only `[perf]` lines, src/db/perf.ts).
#
# Needs a debug build with HEALTH_PERF=1 (src/debug-bootstrap.js) and the app's data ready.
#
#   scripts/perf/screen-timings.sh [-s <adb serial>] [-w <seconds per screen>] [-r <rounds>] [label]
#
# Per screen visit: queries, summed query ms, slowest query ms, and "wall" = ms from the
# screen change to the last query finishing (roughly what the user waits for).  Control-DB
# reads (Sereus Connections) are included, prefixed [control].  Ends with the slowest queries.
set -euo pipefail
SERIAL="${ANDROID_SERIAL:-emulator-5562}"; WAIT=10; ROUNDS=2
while getopts "s:w:r:" o; do case $o in s) SERIAL=$OPTARG;; w) WAIT=$OPTARG;; r) ROUNDS=$OPTARG;; *) exit 2;; esac; done
shift $((OPTIND-1)); LABEL="${1:-run}"
SCREENS=(LogHistory ConfigureCatalog Graphs Settings SereusConnections "EditEntry?mode=new")
LOG=$(mktemp)
HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
adb -s "$SERIAL" logcat -c
for r in $(seq 1 "$ROUNDS"); do
  for s in "${SCREENS[@]}"; do
    adb -s "$SERIAL" shell am start -a android.intent.action.VIEW -d "'health://screen/$s'" >/dev/null 2>&1
    sleep "$WAIT"
  done
done
adb -s "$SERIAL" logcat -d -v time ReactNativeJS:V '*:S' > "$LOG"
LOAD=$(uptime | sed 's/.*load averages*: //')
python3 "$HERE/summarize.py" "$LOG" "$LABEL" "$LOAD"
rm -f "$LOG"
