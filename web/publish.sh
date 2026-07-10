#!/usr/bin/env bash
set -euo pipefail

# Publish the Sereus Health static site + starter catalogs + deep-link association
# entries to https://sereus.org/health/  (path-based, on the existing sereus.org host).
#
# Usage:
#   ./publish.sh [USER@HOST] [SEREUS_ROOT]
#   USER=myuser ./publish.sh [HOST] [SEREUS_ROOT]
# Defaults:
#   HOST: gotchoices.org   (the host that serves sereus.org)
#   USER: root
#   SEREUS_ROOT: /var/www/sereus.org      (docroot of sereus.org)
#
# Two destinations, handled differently (mirrors chat/web/publish.sh):
#   1. PAGE CONTENT → $SEREUS_ROOT/health            (health's own dir; safe to --delete)
#   2. ASSOCIATION FILES → $SEREUS_ROOT/.well-known   (APEX; MERGED, never --delete)
#
# Why the apex + merge: Android App Links and iOS Universal Links only read the
# association files at the HOST ROOT (https://sereus.org/.well-known/…), never under
# /health.  That root is SHARED with other Sereus apps (e.g. chat), so we merge health's
# entries in by key (package_name / appID) instead of overwriting — a plain copy or
# `rsync --delete` there would wipe the other apps' entries.

HOST_ARG="${1:-gotchoices.org}"
if [[ "$HOST_ARG" == *"@"* ]]; then
  REMOTE="$HOST_ARG"
else
  USER="${USER:-root}"
  REMOTE="${USER}@${HOST_ARG}"
fi

SEREUS_ROOT="${2:-/var/www/sereus.org}"
DEST_SITE="$SEREUS_ROOT/health"
DEST_WK="$SEREUS_ROOT/.well-known"
ROOT_DIR="$(cd "$(dirname "$0")" && pwd)"

# Regenerate catalogs from source if the build script and its inputs are present.
if [ -f "$ROOT_DIR/build-catalogs.js" ] && command -v node >/dev/null 2>&1; then
  echo "Regenerating starter catalogs ..."
  node "$ROOT_DIR/build-catalogs.js" || echo "  (skipped — regeneration failed; publishing existing catalogs)"
fi

# ── 1. Page content → sereus.org/health ────────────────────────────────────
# --delete is safe here: it only ever affects health's own directory.  Exclude
# .well-known (handled separately by merge below), the scripts, README, and the
# APK (published separately into the same dir).
echo "Publishing page content to ${REMOTE}:${DEST_SITE} ..."
ssh "$REMOTE" "mkdir -p '$DEST_SITE'"
PAGE_EXCLUDES=(
  "--exclude" ".well-known/"
  "--exclude" "publish.sh"
  "--exclude" "server.sh"
  "--exclude" "build-catalogs.js"
  "--exclude" "README.md"
  "--exclude" "health.apk"
)
if command -v rsync >/dev/null 2>&1; then
  rsync -avz --delete "${PAGE_EXCLUDES[@]}" "$ROOT_DIR/" "$REMOTE:$DEST_SITE/"
else
  echo "ERROR: rsync is required for a safe --delete-scoped publish." >&2
  exit 1
fi

# ── 2. Association files → sereus.org/.well-known (MERGE, no clobber) ───────
# Ship health's single-app association files to a temp dir, then run a merge on
# the server that upserts health's entries into the shared apex files by key.
echo "Merging deep-link association entries into ${REMOTE}:${DEST_WK} ..."
TMP="/tmp/health-wellknown-publish"
ssh "$REMOTE" "rm -rf '$TMP' && mkdir -p '$TMP' '$DEST_WK'"
scp -q \
  "$ROOT_DIR/.well-known/assetlinks.json" \
  "$ROOT_DIR/.well-known/apple-app-site-association" \
  "$REMOTE:$TMP/"

ssh "$REMOTE" "python3 - '$DEST_WK' '$TMP'" <<'PY'
import json, os, sys

dest_wk, tmp = sys.argv[1], sys.argv[2]

def load(path, default):
    try:
        with open(path) as f:
            return json.load(f)
    except FileNotFoundError:
        return default
    except Exception as e:
        raise SystemExit(f"refusing to merge: {path} is not valid JSON ({e})")

def write(path, obj):
    with open(path, 'w') as f:
        json.dump(obj, f, indent=2)
        f.write('\n')

# ── assetlinks.json (JSON array; key = target.package_name) ──
def pkg(stmt):
    return (stmt.get('target') or {}).get('package_name')

app_al = load(os.path.join(tmp, 'assetlinks.json'), [])
apex_al = load(os.path.join(dest_wk, 'assetlinks.json'), [])
app_pkgs = {pkg(s) for s in app_al}
merged_al = [s for s in apex_al if pkg(s) not in app_pkgs] + app_al
write(os.path.join(dest_wk, 'assetlinks.json'), merged_al)

# ── apple-app-site-association (object; key = appID / appIDs[0]) ──
def app_id(d):
    return d.get('appID') or (d.get('appIDs') or [None])[0]

app_aasa = load(os.path.join(tmp, 'apple-app-site-association'), {})
apex_aasa = load(os.path.join(dest_wk, 'apple-app-site-association'),
                 {"applinks": {"apps": [], "details": []}})
apex_aasa.setdefault('applinks', {}).setdefault('apps', [])
apex_details = apex_aasa['applinks'].setdefault('details', [])
app_details = (app_aasa.get('applinks') or {}).get('details', [])
app_ids = {app_id(d) for d in app_details}
apex_aasa['applinks']['details'] = (
    [d for d in apex_details if app_id(d) not in app_ids] + app_details
)
write(os.path.join(dest_wk, 'apple-app-site-association'), apex_aasa)

print(f"  merged: {len(app_al)} assetlinks statement(s), "
      f"{len(app_details)} AASA detail(s) for health; "
      f"apex now has {len(merged_al)} statement(s), "
      f"{len(apex_aasa['applinks']['details'])} detail(s) total")
PY

ssh "$REMOTE" "rm -rf '$TMP'"

echo
echo "Publish complete: https://sereus.org/health/"
echo "Verify (must be 200, valid JSON, no redirect):"
echo "  https://sereus.org/.well-known/assetlinks.json"
echo "  https://sereus.org/.well-known/apple-app-site-association   (Content-Type: application/json)"
echo "Note: guest-invite links (https://sereus.org/health/invite/*) need an invite landing"
echo "page + host rewrite when inbound invitations are wired (not implemented yet)."
