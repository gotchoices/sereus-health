#!/usr/bin/env bash
set -euo pipefail
DEST="root@gotchoices.org:/var/www/sereus.org/health"

# Publish rendered scenarios site to the public server
./appeus/scripts/publish-scenarios.sh --dest $DEST
echo "Published to $DEST"
