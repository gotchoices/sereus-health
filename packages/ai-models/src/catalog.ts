/**
 * models.dev catalog loader.
 *
 * models.dev provides community-maintained capability + pricing metadata for
 * ~150 providers. We fetch `api.json`, trim it to the providers we support,
 * cache it (with a TTL) via an injected {@link CacheStore}, and fall back to a
 * vendored snapshot when offline.
 *
 * IMPORTANT: this is *static catalog* data — it describes what a model can do,
 * NOT whether a given key is entitled to call it. Entitlement comes from the
 * live `/models` adapters. See {@link ./resolve}.
 */
import { PROVIDERS, type CacheStore, type Catalog, type Provider } from './types';
import snapshot from './snapshot/models-snapshot.json';

const CATALOG_URL = 'https://models.dev/api.json';
const CACHE_KEY = 'ai-models:catalog:v1';
const CACHE_TS_KEY = 'ai-models:catalog:v1:ts';
const DEFAULT_TTL_MS = 24 * 60 * 60 * 1000; // 24h

export interface CatalogOptions {
  cache?: CacheStore;
  /** How long a cached catalog is considered fresh. Default 24h. */
  ttlMs?: number;
  /** Override the fetch implementation (mainly for tests). */
  fetchImpl?: typeof fetch;
  /** Force a network refresh, ignoring cache freshness. */
  force?: boolean;
}

/** Reduce a full or snapshot models.dev document to our supported providers. */
function trim(raw: unknown): Catalog {
  const doc = (raw ?? {}) as Record<string, { models?: Record<string, unknown> }>;
  const out = {} as Catalog;
  for (const p of PROVIDERS) {
    out[p] = (doc[p]?.models ?? {}) as Catalog[Provider];
  }
  return out;
}

/** The vendored offline snapshot, always available synchronously. */
export const SNAPSHOT_CATALOG: Catalog = trim(snapshot);

/**
 * Load the trimmed catalog. Resolution order:
 *   1. fresh cache (if within TTL)
 *   2. network fetch of models.dev (cached on success)
 *   3. stale cache (network failed but we have an old copy)
 *   4. vendored snapshot
 */
export async function loadCatalog(opts: CatalogOptions = {}): Promise<Catalog> {
  const { cache, ttlMs = DEFAULT_TTL_MS, fetchImpl = fetch, force = false } = opts;

  if (cache && !force) {
    try {
      const [raw, ts] = await Promise.all([cache.get(CACHE_KEY), cache.get(CACHE_TS_KEY)]);
      if (raw && ts && Date.now() - Number(ts) < ttlMs) {
        return JSON.parse(raw) as Catalog;
      }
    } catch {
      /* ignore cache read errors — fall through to network */
    }
  }

  try {
    const res = await fetchImpl(CATALOG_URL);
    if (res.ok) {
      const trimmed = trim(await res.json());
      if (cache) {
        try {
          await cache.set(CACHE_KEY, JSON.stringify(trimmed));
          await cache.set(CACHE_TS_KEY, String(Date.now()));
        } catch {
          /* ignore cache write errors — data is still usable this session */
        }
      }
      return trimmed;
    }
  } catch {
    /* network failed — fall through to stale cache / snapshot */
  }

  if (cache) {
    try {
      const raw = await cache.get(CACHE_KEY);
      if (raw) return JSON.parse(raw) as Catalog;
    } catch {
      /* ignore */
    }
  }

  return SNAPSHOT_CATALOG;
}
