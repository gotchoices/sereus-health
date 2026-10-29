/**
 * What the entry editor hands to a background save, and the pure steps that turn it into the
 * rows `db/logEntries` writes. Kept free of React and the database so it can be unit-tested.
 */

/** One item or bundle the user added, as the editor holds it. */
export interface DraftItem {
  id: string;
  isBundle: boolean;
  /** Quantifier values by quantifier id (items only; bundles carry none). */
  values: Record<string, number>;
}

/** The editor's state at Save: everything needed to write the entry later. */
export interface EntryDraft {
  timestamp: string;
  typeId: string;
  comment: string | null;
  items: DraftItem[];
}

export interface SaveItem {
  itemId: string;
  sourceBundleId: string | null;
  quantifiers: Array<{ quantifierId: string; value: number }>;
}

/**
 * Expand bundles into their member items and de-duplicate by item, MERGING rather than
 * keeping-first: an item can appear both via a bundle (no quantifiers) and as a direct add
 * (with quantifier values). Keep whichever occurrence carries quantifiers, and prefer a direct
 * add (null bundle) for provenance — so values aren't lost just because the bundle was listed
 * first. `bundleMembers` maps each bundle id in the draft to its member item ids.
 */
export function toSaveItems(items: DraftItem[], bundleMembers: ReadonlyMap<string, string[]>): SaveItem[] {
  const expanded: SaveItem[] = [];
  for (const a of items) {
    if (a.isBundle) {
      for (const mid of bundleMembers.get(a.id) ?? []) expanded.push({ itemId: mid, sourceBundleId: a.id, quantifiers: [] });
    } else {
      const quantifiers = Object.entries(a.values).map(([quantifierId, value]) => ({ quantifierId, value }));
      expanded.push({ itemId: a.id, sourceBundleId: null, quantifiers });
    }
  }
  const byId = new Map<string, SaveItem>();
  for (const it of expanded) {
    const prev = byId.get(it.itemId);
    if (!prev) {
      byId.set(it.itemId, it);
      continue;
    }
    byId.set(it.itemId, {
      itemId: it.itemId,
      sourceBundleId: prev.sourceBundleId === null || it.sourceBundleId === null ? null : prev.sourceBundleId,
      quantifiers: prev.quantifiers.length ? prev.quantifiers : it.quantifiers,
    });
  }
  return Array.from(byId.values());
}
