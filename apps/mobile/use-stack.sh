#!/usr/bin/env bash
#
# health/apps/mobile/use-stack.sh — switch this app between the two ways of
# consuming the ser-local stack (@optimystic/*, @quereus/*, @serfab/*, p2p-fret):
#
#   local  — resolve every ser package from your local clones under ser/ via
#            yarn `portal:` specs (dependencies + resolutions).  Use this when
#            you are co-developing one of those packages and want live source.
#            Requires the clones to be present + built (see ../../../pull-stack.sh).
#
#   npm    — resolve every ser package from npmjs.org at pinned semver ranges.
#            Use this for ordinary app work when you don't need local source.
#
# The ONLY file this script edits is package.json (the `dependencies` and
# `resolutions` blocks).  `metro.config.js` reads the resulting package.json to
# decide whether to alias the ser packages to local source, so it follows along
# automatically — there is no second switch to keep in sync.
#
# Usage:
#   bash use-stack.sh              # show current mode + per-package specs
#   bash use-stack.sh status       # same as above
#   bash use-stack.sh local        # rewrite package.json to portal specs
#   bash use-stack.sh npm          # rewrite package.json to npm semver ranges
#   bash use-stack.sh local --install   # also run `yarn install` afterwards
#   bash use-stack.sh npm   --install   # (default is to NOT install; just edit)
#
# After switching you must reinstall so node_modules matches:
#   yarn install          (add --install to have this script run it for you)
# and for iOS also: cd ios && pod install
#
# Verify a `local` switch wired up correctly with:  bash stack-check
#
# NOTE: the npm semver ranges below are a pinned snapshot.  Bump them here when
# you intend to adopt a newer published stack, then run `npm`.  Non-ser deps and
# the libp2p/etc. compatibility pins in `resolutions` are never touched.

set -uo pipefail

APP_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

CMD="${1:-status}"
DO_INSTALL=0
for arg in "$@"; do
  case "$arg" in
    --install) DO_INSTALL=1 ;;
  esac
done

case "$CMD" in
  local|npm|status) ;;
  -h|--help)
    sed -n '2,40p' "${BASH_SOURCE[0]}" | sed 's/^# \{0,1\}//'
    exit 0 ;;
  *)
    echo "use-stack.sh: unknown command '$CMD' (expected: local | npm | status)" >&2
    exit 2 ;;
esac

REPORT=$(APP_DIR="$APP_DIR" MODE="$CMD" python3 - <<'PY'
import json, os, sys, collections

APP_DIR = os.environ['APP_DIR']
MODE    = os.environ['MODE']
pj_path = os.path.join(APP_DIR, 'package.json')

# ser-local package table — the single source of truth for the toggle.
#   name : (portal_path_relative_to_app, npm_range, in_deps, in_res)
# Ordered to match the current resolutions layout so a `local` switch produces
# a minimal diff.  `in_deps` packages appear in `dependencies`; `in_res`
# packages appear in `resolutions` when in local mode.
PACKAGES = collections.OrderedDict([
    ('@optimystic/db-core',                  ('../../../optimystic/packages/db-core',                  '^0.14.1', True,  True)),
    ('@optimystic/db-p2p',                   ('../../../optimystic/packages/db-p2p',                   '^0.14.1', True,  True)),
    ('@optimystic/db-p2p-storage-rn',        ('../../../optimystic/packages/db-p2p-storage-rn',        '^0.14.1', True,  True)),
    ('@optimystic/quereus-plugin-crypto',    ('../../../optimystic/packages/quereus-plugin-crypto',    '^0.14.1', True,  True)),
    ('@optimystic/quereus-plugin-optimystic',('../../../optimystic/packages/quereus-plugin-optimystic','^0.14.1', True,  True)),
    ('@quereus/quereus',                     ('../../../quereus/packages/quereus',                     '^3.3.0',  True,  True)),
    ('@quereus/isolation',                   ('../../../quereus/packages/quereus-isolation',           '^3.3.0',  True,  True)),
    ('@quereus/store',                       ('../../../quereus/packages/quereus-store',               '^3.3.0',  True,  True)),
    ('@quereus/plugin-leveldb',              ('../../../quereus/packages/quereus-plugin-leveldb',      '^3.3.0',  False, True)),
    ('@serfab/strand-proto',                 ('../../../sereus/packages/strand-proto',                 '^0.8.1',  False, True)),
    ('p2p-fret',                             ('../../../fret/packages/fret',                            '^0.6.0',  True,  True)),
    # dep-only ser packages (never in resolutions)
    ('@quereus/plugin-react-native-leveldb', ('../../../quereus/packages/quereus-plugin-react-native-leveldb', '^3.3.0', True, False)),
    ('@serfab/cadre-core',                   ('../../../sereus/packages/cadre-core',                   '^0.8.1',  True,  False)),
])
NAMES = set(PACKAGES)
SENTINEL = '@serfab/cadre-core'  # its spec tells us the current mode

with open(pj_path) as f:
    p = json.load(f, object_pairs_hook=collections.OrderedDict)

deps = p.get('dependencies') or collections.OrderedDict()
res  = p.get('resolutions')  or collections.OrderedDict()

def current_mode():
    spec = deps.get(SENTINEL, '')
    return 'local' if str(spec).startswith('portal:') else 'npm'

cur = current_mode()

if MODE == 'status':
    print(f"__MODE__ {cur}")
    print(f"Current stack mode: {cur.upper()}")
    print()
    print(f"  {'package':<42s} {'dependencies':<34s} resolutions")
    print(f"  {'-'*42} {'-'*34} {'-'*20}")
    for name, (path, rng, in_deps, in_res) in PACKAGES.items():
        d = deps.get(name, '—') if in_deps else '(transitive)'
        r = res.get(name, '—')
        d = d if len(str(d)) <= 33 else str(d)[:30] + '...'
        r = r if len(str(r)) <= 20 else str(r)[:17] + '...'
        print(f"  {name:<42s} {str(d):<34s} {r}")
    sys.exit(0)

if MODE == cur:
    print(f"__MODE__ {cur}")
    print(f"__NOCHANGE__ already in {cur.upper()} mode; nothing to do.")
    sys.exit(0)

# --- rewrite dependencies (in place; keys already present) ---
for name, (path, rng, in_deps, in_res) in PACKAGES.items():
    if not in_deps:
        continue
    if name not in deps:
        # Defensive: keep whatever exists, but warn.
        print(f"__WARN__ expected dependency {name} not found; adding it.")
    deps[name] = ('portal:' + path) if MODE == 'local' else rng

# --- rebuild resolutions: ser-local block + preserved rest ---
# The ser packages are pinned in `resolutions` in BOTH modes so a single version
# wins tree-wide.  In local mode that's the portal target; in npm mode it's the
# semver range — which also COERCES transitive deps that declare a stale range
# (e.g. optimystic still asks for @quereus/quereus@^0.16.2) onto our chosen
# version.  This is the npm equivalent of portal ignoring declared ranges.
preserved = collections.OrderedDict((k, v) for k, v in res.items() if k not in NAMES)
ser_block = collections.OrderedDict()
for name, (path, rng, in_deps, in_res) in PACKAGES.items():
    if in_res:
        ser_block[name] = ('portal:' + path) if MODE == 'local' else rng

new_res = collections.OrderedDict()
for k, v in ser_block.items():
    new_res[k] = v
for k, v in preserved.items():
    new_res[k] = v

p['dependencies'] = deps
p['resolutions'] = new_res

with open(pj_path, 'w') as f:
    json.dump(p, f, indent=2, ensure_ascii=False)
    f.write('\n')

print(f"__MODE__ {MODE}")
print(f"__CHANGED__ {cur} -> {MODE}")
PY
)
RC=$?

echo "$REPORT" | grep -vE '^__(MODE|NOCHANGE|CHANGED|WARN)__' | sed '/^$/N;/^\n$/D' 2>/dev/null || echo "$REPORT" | grep -vE '^__(MODE|NOCHANGE|CHANGED|WARN)__'
echo "$REPORT" | grep '^__WARN__' | sed 's/^__WARN__ /WARNING: /'

if [ $RC -ne 0 ]; then
  exit $RC
fi

if echo "$REPORT" | grep -q '^__NOCHANGE__'; then
  echo "$REPORT" | grep '^__NOCHANGE__' | sed 's/^__NOCHANGE__ //'
  exit 0
fi

if echo "$REPORT" | grep -q '^__CHANGED__'; then
  echo
  echo "package.json rewritten for '$CMD' mode."
  if [ "$DO_INSTALL" = "1" ]; then
    echo "Running yarn install ..."
    ( cd "$APP_DIR" && yarn install )
    IRC=$?
    echo
    if [ "$CMD" = "local" ]; then
      echo "Next: verify wiring with  bash stack-check"
      echo "      (run ../../../pull-stack.sh first if it reports stale builds)"
    else
      echo "Next (npm mode): pinned to the coherent published set (quereus 3.3.0,"
      echo "      optimystic 0.14.x).  quereus 4.x is intentionally avoided — the rest"
      echo "      of the stack has not adopted it yet.  For iOS also run:"
      echo "      cd ios && pod install"
    fi
    exit $IRC
  else
    echo "Next steps:"
    echo "  1. yarn install          # sync node_modules to the new mode"
    if [ "$CMD" = "local" ]; then
      echo "  2. bash stack-check      # confirm portal wiring + built targets"
    else
      echo "  2. cd ios && pod install # (iOS native deps)"
      echo "     Note: pinned to quereus 3.3.0 (the coherent set); quereus 4.x is"
      echo "     avoided until optimystic + src/db adopt it."
    fi
  fi
fi

exit 0
