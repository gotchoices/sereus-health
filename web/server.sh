#!/usr/bin/env bash
set -euo pipefail
# Preview the site locally at http://localhost:8080
ROOT_DIR="$(cd "$(dirname "$0")" && pwd)"
PORT="${1:-8080}"
echo "Serving $ROOT_DIR at http://localhost:${PORT}  (Ctrl-C to stop)"
cd "$ROOT_DIR"
exec python3 -m http.server "$PORT"
