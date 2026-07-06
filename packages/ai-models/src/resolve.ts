/**
 * Model selection: intersect what a key can call (live `/models`) with what
 * each model can do (models.dev), then pick or validate a model.
 */
import {
  type CapabilityKey,
  type Catalog,
  type CatalogModel,
  type Credential,
  type LiveModel,
  type ModelInfo,
  type ModelSource,
  type Provider,
} from './types';
import { loadCatalog, type CatalogOptions } from './catalog';
import { listLiveModels } from './providers';
import { deriveCapabilities, isCatalogChatModel, matchCatalog, modalitiesOf } from './capabilities';

const EMPTY_CAPS = {
  vision: false,
  pdf: false,
  audioIn: false,
  tools: false,
  structuredOutput: false,
  reasoning: false,
  attachment: false,
};

function build(provider: Provider, live: LiveModel | null, cat?: CatalogModel): ModelInfo {
  const id = live?.id ?? cat?.id ?? 'unknown';
  const source: ModelSource = live && cat ? 'both' : live ? 'live' : 'catalog';
  return {
    id,
    provider,
    label: cat?.name ?? live?.label ?? id,
    capabilities: cat ? deriveCapabilities(cat) : { ...EMPTY_CAPS },
    modalities: cat ? modalitiesOf(cat) : [],
    contextLimit: cat?.limit?.context,
    outputLimit: cat?.limit?.output,
    cost: cat?.cost
      ? {
          input: cat.cost.input,
          output: cat.cost.output,
          cacheRead: cat.cost.cache_read,
          cacheWrite: cat.cost.cache_write,
          reasoning: cat.cost.reasoning,
        }
      : undefined,
    releaseDate: cat?.release_date,
    lastUpdated: cat?.last_updated,
    status: cat?.status,
    source,
  };
}

function ts(v?: string): number {
  return (v && Date.parse(v)) || 0;
}

/** Stable listing order for a picker UI: non-deprecated first, then newest. */
function sortForListing(models: ModelInfo[]): void {
  models.sort((a, b) => {
    const da = a.status === 'deprecated' ? 1 : 0;
    const db = b.status === 'deprecated' ? 1 : 0;
    if (da !== db) return da - db;
    return ts(b.lastUpdated ?? b.releaseDate) - ts(a.lastUpdated ?? a.releaseDate);
  });
}

export interface ListOptions extends CatalogOptions {
  /** Pass a pre-loaded catalog to avoid re-fetching across calls. */
  catalog?: Catalog;
}

export interface AvailableModels {
  models: ModelInfo[];
  /**
   * true  → `models` reflects this key's actual entitlements (live list succeeded).
   * false → live listing failed; `models` is catalog-only and NOT verified callable.
   */
  entitlementVerified: boolean;
  warning?: string;
}

/**
 * List models for a credential, enriched with capability metadata.
 * If the live listing fails (offline, bad key), falls back to the catalog for
 * the provider and flags `entitlementVerified: false`.
 */
export async function listAvailableModels(
  cred: Credential,
  opts: ListOptions = {},
): Promise<AvailableModels> {
  const catalog = opts.catalog ?? (await loadCatalog(opts));

  let live: LiveModel[] | null = null;
  let warning: string | undefined;
  try {
    live = await listLiveModels(cred.provider, cred.apiKey);
  } catch (e) {
    warning = `Could not list models from ${cred.provider}: ${(e as Error).message}`;
  }

  if (live && live.length) {
    const models = live.map((lm) => build(cred.provider, lm, matchCatalog(cred.provider, lm.id, catalog)));
    sortForListing(models);
    return { models, entitlementVerified: true, warning };
  }

  // Catalog-only fallback: models.dev mixes in embedding/image/TTS models whose
  // text→text modalities look like chat, so filter to chat models by id here
  // (the live adapters already filter their own results).
  const catEntries = Object.entries(catalog[cred.provider] ?? {}).filter(([id]) =>
    isCatalogChatModel(cred.provider, id),
  );
  const models = catEntries.map(([, cm]) => build(cred.provider, null, cm));
  sortForListing(models);
  return { models, entitlementVerified: false, warning };
}

function meetsAll(m: ModelInfo, require: CapabilityKey[]): boolean {
  return require.every((c) => m.capabilities[c]);
}

/** Auto-pick a default: cheapest-capable (or most-capable) non-deprecated model. */
function pickDefault(
  models: ModelInfo[],
  require: CapabilityKey[],
  prefer: 'cheap' | 'capable',
): ModelInfo | undefined {
  const eligible = models.filter((m) => m.status !== 'deprecated' && meetsAll(m, require));
  if (!eligible.length) return undefined;

  return eligible.slice().sort((a, b) => {
    const ca = a.cost?.input ?? Infinity;
    const cb = b.cost?.input ?? Infinity;
    if (prefer === 'cheap') {
      if (ca !== cb) return ca - cb;
    } else {
      // 'capable': prefer pricier (a rough proxy for flagship tier)
      const fa = ca === Infinity ? -1 : ca;
      const fb = cb === Infinity ? -1 : cb;
      if (fa !== fb) return fb - fa;
    }
    return ts(b.lastUpdated ?? b.releaseDate) - ts(a.lastUpdated ?? a.releaseDate);
  })[0];
}

export interface ResolveOptions extends ListOptions {
  /** User-specified model id. When set, it is honored (validated as a warning). */
  model?: string;
  /** Capabilities the chosen model must have (e.g. `['vision']`). */
  require?: CapabilityKey[];
  /** How to auto-pick when `model` is not set. Default `'cheap'`. */
  prefer?: 'cheap' | 'capable';
}

export interface ResolveResult {
  /** The model id to hand to the chat layer. Empty string if nothing suitable. */
  id: string;
  /** The resolved model's metadata, when known. */
  model?: ModelInfo;
  entitlementVerified: boolean;
  /** Advisory only — an unlisted override or an unmet capability, not a hard error. */
  warning?: string;
}

/**
 * Resolve a model id to use.
 *
 * - `opts.model` set & found → use it.
 * - `opts.model` set & not in a verified list → honor it, warn.
 * - `opts.model` set but missing a required capability → honor it, warn.
 * - `opts.model` unset → auto-pick per `prefer` + `require`.
 */
export async function resolveModel(
  cred: Credential,
  opts: ResolveOptions = {},
): Promise<ResolveResult> {
  const { models, entitlementVerified, warning } = await listAvailableModels(cred, opts);
  const require = opts.require ?? [];
  const wanted = opts.model?.trim();

  if (wanted) {
    const found = models.find((m) => m.id === wanted);
    if (!found) {
      const w = entitlementVerified
        ? `"${wanted}" is not among the models available to this ${cred.provider} key.`
        : warning;
      return { id: wanted, entitlementVerified, warning: w };
    }
    const missing = require.filter((c) => !found.capabilities[c]);
    const w = missing.length
      ? `"${wanted}" may not support: ${missing.join(', ')}.`
      : warning;
    return { id: found.id, model: found, entitlementVerified, warning: w };
  }

  const pick = pickDefault(models, require, opts.prefer ?? 'cheap');
  if (!pick) {
    const reqStr = require.length ? require.join(', ') : 'none';
    return {
      id: '',
      entitlementVerified,
      warning: warning ?? `No ${cred.provider} model matches required capabilities: ${reqStr}.`,
    };
  }
  return { id: pick.id, model: pick, entitlementVerified, warning };
}
