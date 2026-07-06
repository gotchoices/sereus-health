/**
 * Core types for cross-provider model discovery and selection.
 *
 * This module is framework-free — it must not import `ai` or any `@ai-sdk/*`
 * package. Those live only under `./chat`.
 */

export type Provider = 'openai' | 'anthropic' | 'google';

export const PROVIDERS: readonly Provider[] = ['openai', 'anthropic', 'google'];

export type Modality = 'text' | 'image' | 'audio' | 'video' | 'pdf';

/**
 * Normalized capability flags, derived from models.dev metadata.
 * `vision`/`pdf`/`audioIn` gate what a model accepts as *input* — use these to
 * enable/disable an attachment affordance for the selected model.
 */
export interface Capabilities {
  /** Accepts image input (multimodal / vision). */
  vision: boolean;
  /** Accepts PDF/document input. */
  pdf: boolean;
  /** Accepts audio input. */
  audioIn: boolean;
  /** Supports tool / function calling. */
  tools: boolean;
  /** Supports structured (JSON-schema) output. */
  structuredOutput: boolean;
  /** Is a reasoning model. */
  reasoning: boolean;
  /** Supports file attachments generally. */
  attachment: boolean;
}

export type CapabilityKey = keyof Capabilities;

export interface ModelCost {
  /** USD per million input tokens. */
  input?: number;
  /** USD per million output tokens. */
  output?: number;
  cacheRead?: number;
  cacheWrite?: number;
  reasoning?: number;
}

/**
 * Provenance of a {@link ModelInfo}:
 * - `live`    — returned by the provider for this key (callable), no catalog match.
 * - `catalog` — known only from models.dev (capabilities known, entitlement NOT verified).
 * - `both`    — callable AND enriched with catalog metadata.
 */
export type ModelSource = 'live' | 'catalog' | 'both';

/** A model surfaced to the app: what it is + what it can do. */
export interface ModelInfo {
  id: string;
  provider: Provider;
  label: string;
  capabilities: Capabilities;
  modalities: Modality[];
  contextLimit?: number;
  outputLimit?: number;
  cost?: ModelCost;
  releaseDate?: string;
  lastUpdated?: string;
  /** e.g. `deprecated`, `beta` (from models.dev), when present. */
  status?: string;
  source: ModelSource;
}

/** Raw per-model record shape from models.dev `api.json`. */
export interface CatalogModel {
  id: string;
  name?: string;
  family?: string;
  attachment?: boolean;
  reasoning?: boolean;
  tool_call?: boolean;
  structured_output?: boolean;
  temperature?: boolean;
  knowledge?: string;
  release_date?: string;
  last_updated?: string;
  open_weights?: boolean;
  status?: string;
  modalities?: { input?: string[]; output?: string[] };
  limit?: { context?: number; input?: number; output?: number };
  cost?: {
    input?: number;
    output?: number;
    cache_read?: number;
    cache_write?: number;
    reasoning?: number;
  };
}

/** models.dev catalog, trimmed to the providers this package supports. */
export type Catalog = Record<Provider, Record<string, CatalogModel>>;

/** A model as returned by a provider's own `/models` endpoint. */
export interface LiveModel {
  id: string;
  label?: string;
  /** Epoch millis, when the provider reports a creation time. */
  created?: number;
}

/**
 * Injected key/value cache (e.g. an AsyncStorage-backed adapter).
 * Optional everywhere — when omitted, the catalog is fetched fresh each call
 * and falls back to the vendored snapshot offline.
 */
export interface CacheStore {
  get(key: string): Promise<string | null>;
  set(key: string, value: string): Promise<void>;
}

export interface Credential {
  provider: Provider;
  apiKey: string;
}

/** Thrown by provider `/models` adapters when the listing request fails. */
export class ModelListError extends Error {
  constructor(
    public provider: Provider,
    public status: number | undefined,
    message: string,
  ) {
    super(message);
    this.name = 'ModelListError';
  }
}
