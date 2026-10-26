#!/usr/bin/env bash
# write-timings.sh [-s serial] [-n writes] [-w seconds between] [label] — trigger N timed log-entry
# saves (health://perf/write, src/db/perfWrite.ts; needs HEALTH_PERF=1) and report each `[perf] write` ms.
set -euo pipefail
SERIAL="${ANDROID_SERIAL:-emulator-5562}"; N=4; WAIT=12
while getopts "s:n:w:" o; do case $o in s) SERIAL=$OPTARG;; n) N=$OPTARG;; w) WAIT=$OPTARG;; *) exit 2;; esac; done
shift $((OPTIND-1)); LABEL="${1:-writes}"
adb -s "$SERIAL" logcat -c
for i in $(seq 1 "$N"); do adb -s "$SERIAL" shell am start -a android.intent.action.VIEW -d "'health://perf/write'" >/dev/null 2>&1; sleep "$WAIT"; done
echo "== $LABEL"
adb -s "$SERIAL" logcat -d -v time ReactNativeJS:V '*:S' | grep -oE "\[perf\] write [0-9]+.*|\[perf\] write failed.*" | sed 's/^/  /'
