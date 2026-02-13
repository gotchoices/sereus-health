/**
 * Data layer switches
 *
 * USE_QUEREUS:
 *   true  → real data (Quereus database)
 *   false → mock data variants (scenario tooling)
 *
 * USE_OPTIMYSTIC:
 *   true  → optimystic backend (CadreNode + strand, distributed-ready)
 *   false → leveldb backend (local-only, legacy)
 *
 * Higher-level code (data adapters, screens) should only check USE_QUEREUS.
 * The optimystic/leveldb distinction is hidden inside src/db/.
 */
export const USE_QUEREUS = true;
export const USE_OPTIMYSTIC = true;
