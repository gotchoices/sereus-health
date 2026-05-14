/**
 * Data layer switches — three modes total.
 *
 * Mode A — Mocks only (no real DB):
 *   USE_QUEREUS = false
 *   `src/mock/config.ts` derives `mockMode = !USE_QUEREUS`, so the data
 *   adapters fall back to in-memory mock variants.  `USE_OPTIMYSTIC` is
 *   ignored in this mode.
 *
 * Mode B — Quereus + direct LevelDB (local-only, legacy):
 *   USE_QUEREUS = true, USE_OPTIMYSTIC = false
 *   `src/db/index.ts::initLeveldb()` builds a standalone Quereus `Database`
 *   and registers `@quereus/plugin-react-native-leveldb`.  Rows live in
 *   per-table `rn-leveldb` directories under the `quereus.*` prefix.  No
 *   libp2p, no networking.
 *
 * Mode C — Quereus + Optimystic (sereus-enabled, distributed-ready):
 *   USE_QUEREUS = true, USE_OPTIMYSTIC = true
 *   `src/db/index.ts::initOptimystic()` boots `CadreService`, which starts
 *   a `CadreNode` (libp2p) and creates a health strand.  The strand's
 *   Quereus `Database` writes through the optimystic vtable → CadreNode
 *   repo → `LevelDBRawStorage` → `rn-leveldb`.  The leaf is still
 *   LevelDB, but that's an internal block store — NOT the same thing as
 *   Mode B's per-table direct-LevelDB layout.
 *
 * Higher-level code (data adapters, screens) should only check USE_QUEREUS.
 * The optimystic/leveldb distinction is hidden inside `src/db/`.
 */
export const USE_QUEREUS = true;
export const USE_OPTIMYSTIC = true;
