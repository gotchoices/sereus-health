import type { Capabilities, Catalog, CatalogModel, Modality, Provider } from './types';

const KNOWN_MODALITIES: readonly string[] = ['text', 'image', 'audio', 'video', 'pdf'];

/** Derive normalized capability flags from a models.dev record. */
export function deriveCapabilities(m: CatalogModel): Capabilities {
  const input = m.modalities?.input ?? [];
  const has = (x: string) => input.includes(x);
  return {
    vision: has('image'),
    pdf: has('pdf') || !!m.attachment,
    audioIn: has('audio'),
    tools: !!m.tool_call,
    structuredOutput: !!m.structured_output,
    reasoning: !!m.reasoning,
    attachment: !!m.attachment,
  };
}

/** Known input modalities for a catalog model. */
export function modalitiesOf(m: CatalogModel): Modality[] {
  return (m.modalities?.input ?? []).filter((x): x is Modality =>
    KNOWN_MODALITIES.includes(x),
  );
}

/**
 * Id-based "is this a chat/completion model?" heuristic, per provider.
 *
 * Needed for the *catalog-only fallback* (when live listing fails): models.dev
 * lists embedding, image, and TTS models whose text→text modalities are
 * indistinguishable from chat, so they must be excluded by id. The live
 * adapters already filter their own results, so this is not applied to them.
 */
const CATALOG_CHAT_FILTER: Record<Provider, RegExp[]> = {
  // [must match, must NOT match]
  openai: [/^(gpt-|o\d|chatgpt)/i, /embed|whisper|tts|dall-?e|image|realtime|moderation|audio|transcribe|search|deep-research/i],
  anthropic: [/^claude/i, /(?!)/ /* never excludes */],
  google: [/^(gemini|gemma)/i, /embed|imagen|aqa|tts|image|native-audio|learnlm/i],
};

export function isCatalogChatModel(provider: Provider, id: string): boolean {
  const [include, exclude] = CATALOG_CHAT_FILTER[provider];
  return include.test(id) && !exclude.test(id);
}

/** Trailing date / alias suffix on a live model id (e.g. `-20241022`, `-latest`). */
const DATE_SUFFIX = /-(?:\d{8}|\d{6}|\d{4}-\d{2}-\d{2}|latest|preview(?:-\d+)?|exp(?:-[\w.]+)?)$/i;

/**
 * Match a live model id against the catalog, tolerating dated snapshots and
 * aliases that the provider returns but models.dev keys under a base id.
 *
 * Strategy: exact → base id (suffix stripped) → longest catalog id that is a
 * prefix of the live id (or of its base). Returns undefined when nothing fits.
 */
export function matchCatalog(
  provider: Provider,
  liveId: string,
  catalog: Catalog,
): CatalogModel | undefined {
  const models = catalog[provider] ?? {};
  if (models[liveId]) return models[liveId];

  const base = liveId.replace(DATE_SUFFIX, '');
  if (base !== liveId && models[base]) return models[base];

  let best: CatalogModel | undefined;
  let bestLen = 0;
  for (const [cid, cm] of Object.entries(models)) {
    const isPrefixMatch = liveId.startsWith(cid) || base.startsWith(cid);
    if (isPrefixMatch && cid.length > bestLen) {
      best = cm;
      bestLen = cid.length;
    }
  }
  return best;
}
