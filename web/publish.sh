#!/usr/bin/env bash
set -euo pipefail

# Publish the Sereus Health static site + starter catalogs to sereus.org/health
# Usage:
#   ./publish.sh [USER@HOST] [DEST_PATH]
#   USER=myuser ./publish.sh [HOST] [DEST_PATH]
# Defaults:
#   HOST: gotchoices.org   (the host that serves sereus.org)
#   USER: root             (override with USER env var or user@host arg)
#   DEST_PATH: /var/www/sereus.org/health

HOST_ARG="${1:-gotchoices.org}"
if [[ "$HOST_ARG" == *"@"* ]]; then
  REMOTE="$HOST_ARG"
else
  USER="${USER:-root}"
  REMOTE="${USER}@${HOST_ARG}"
fi

DEST="${2:-/var/www/sereus.org/health}"
ROOT_DIR="$(cd "$(dirname "$0")" && pwd)"

# Regenerate catalogs from source if the build script and its inputs are present.
if [ -f "$ROOT_DIR/build-catalogs.js" ] && command -v node >/dev/null 2>&1; then
  echo "Regenerating starter catalogs ..."
  node "$ROOT_DIR/build-catalogs.js" || echo "  (skipped — regeneration failed; publishing existing catalogs)"
fi

echo "Publishing to ${REMOTE}:${DEST} ..."
ssh "$REMOTE" "mkdir -p '$DEST'"

EXCLUDES=(
  "--exclude" "publish.sh"
  "--exclude" "server.sh"
  "--exclude" "build-catalogs.js"
  "--exclude" "README.md"
)

if command -v rsync >/dev/null 2>&1; then
  rsync -avz --delete "${EXCLUDES[@]}" "$ROOT_DIR/" "$REMOTE:$DEST/"
else
  echo "rsync not found; using scp (excludes ignored). Consider installing rsync."
  scp -r "$ROOT_DIR"/* "$REMOTE:$DEST/"
fi

HOST_ONLY="${REMOTE##*@}"
echo "Publish complete: https://sereus.org/health/"
