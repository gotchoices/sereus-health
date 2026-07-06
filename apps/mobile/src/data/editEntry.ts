import { getVariant } from '../mock';
import { USE_QUEREUS } from '../db/config';
import { ensureDatabaseInitialized } from '../db/init';
import * as dbStats from '../db/stats';
import * as dbLogEntries from '../db/logEntries';
import * as dbCatalog from '../db/catalog';

export type EditEntryMode = 'new' | 'edit' | 'clone';

export type QuantifierValue = {
  label: string;
  value: number;
  units: string;
};

export type EditEntryModel = {
  id: string;
  mode: EditEntryMode;
  type: string;
  title: string;
  timestamp: string;
  comment: string;
  quantifiers: QuantifierValue[];
  // Optional hydration for edit/clone modes
  categoryId?: string;
  itemIds?: string[];
  items?: HydratedItem[];
};

export type StatRow = { id: string; name: string; usageCount: number };
export type ItemStatRow = StatRow & { isBundle: boolean };

/** An item or bundle available for a Type (across categories) — item picker row. */
export type TypeItem = { id: string; name: string; usageCount: number; isBundle: boolean; categoryId: string | null; categoryName: string | null };
export type ItemQuantifierDef = { id: string; name: string; minValue: number | null; maxValue: number | null; units: string | null };
/** An item added to the entry (with quantifier defs + any values). */
export type HydratedItem = {
  id: string; name: string; categoryName: string | null; isBundle: boolean; sourceBundleId: string | null;
  quantifiers: Array<ItemQuantifierDef & { value?: number }>;
};
/** Shape passed to save (bundles already expanded; quantifier values attached). */
export type SaveItem = { itemId: string; sourceBundleId: string | null; quantifiers: Array<{ quantifierId: string; value: number }> };

export type EditEntryStats = {
  typeStats: StatRow[];
  categoryStats: Record<string, StatRow[]>;
  itemStats: Record<string, ItemStatRow[]>;
};

function loadEntryMock(variant: string): EditEntryModel {
  // Require avoids TS json-module config differences.
  switch (variant) {
    case 'error':
      return require('../../mock/data/edit-entry.error.json') as EditEntryModel;
    case 'happy':
    default:
      return require('../../mock/data/edit-entry.happy.json') as EditEntryModel;
  }
}

function loadStatsMock(variant: string): EditEntryStats {
  switch (variant) {
    case 'empty':
      return require('../../mock/data/edit-entry-stats.empty.json') as EditEntryStats;
    case 'happy':
    default:
      return require('../../mock/data/edit-entry-stats.happy.json') as EditEntryStats;
  }
}

export async function getEditEntry(mode: EditEntryMode, entryId?: string): Promise<EditEntryModel> {
  if (!USE_QUEREUS) {
    const variant = getVariant();
    if (variant === 'error') {
      throw new Error('mock:error');
    }

    if (mode === 'new') {
      return {
        id: entryId ?? 'new',
        mode,
        type: '',
        title: '',
        timestamp: new Date().toISOString(),
        comment: '',
        quantifiers: [],
      };
    }

    const base = loadEntryMock(variant);
    return {
      ...base,
      id: entryId ?? base.id,
      mode,
      timestamp: mode === 'clone' ? new Date().toISOString() : base.timestamp,
    };
  }

  if (mode === 'new') {
    return {
      id: entryId ?? 'new',
      mode,
      type: '',
      title: '',
      timestamp: new Date().toISOString(),
      comment: '',
      quantifiers: [],
    };
  }

  if (!entryId) {
    throw new Error('missing entryId');
  }

  await ensureDatabaseInitialized();
  const e = await dbLogEntries.getLogEntryById(entryId);
  if (!e) throw new Error('not found');

  const items: HydratedItem[] = e.items.map((it) => ({
    id: it.id,
    name: it.name,
    categoryName: it.categoryName ?? null,
    isBundle: false,
    sourceBundleId: it.sourceBundleId ?? null,
    quantifiers: (it.quantifiers ?? []).map((q) => ({
      id: q.id, name: q.name, minValue: q.minValue ?? null, maxValue: q.maxValue ?? null, units: q.units ?? null, value: q.value,
    })),
  }));

  return {
    id: e.id,
    mode,
    type: e.typeName,
    title: '',
    timestamp: mode === 'clone' ? new Date().toISOString() : e.timestamp,
    comment: e.comment ?? '',
    quantifiers: [],
    categoryId: e.items[0]?.categoryId,
    itemIds: e.items.map((it) => it.id),
    items,
  };
}

/** Items + bundles for a Type (across categories) — for the logging item picker. */
export async function getItemsForType(typeId: string): Promise<TypeItem[]> {
  if (!USE_QUEREUS) return [];
  await ensureDatabaseInitialized();
  return dbStats.getItemsForType(typeId);
}

/** Quantifier definitions for one item. */
export async function getItemQuantifiers(itemId: string): Promise<ItemQuantifierDef[]> {
  if (!USE_QUEREUS) return [];
  await ensureDatabaseInitialized();
  const detail = await dbCatalog.getItemDetail(itemId);
  return (detail?.quantifiers ?? []).map((q) => ({ id: q.id, name: q.name, minValue: q.minValue, maxValue: q.maxValue, units: q.units }));
}

export async function getCategoriesForTypeName(typeName: string): Promise<Array<{ id: string; name: string }>> {
  if (!USE_QUEREUS) return [];
  await ensureDatabaseInitialized();
  return dbCatalog.getCategoriesForType(typeName);
}

/** Create an item (and its category/quantifiers) on the fly while logging. Idempotent by (category, name). */
export async function createInlineItem(input: {
  typeName: string; categoryName: string; name: string;
  quantifiers?: Array<{ name: string; minValue?: number; maxValue?: number; units?: string }>;
}): Promise<{ id: string; quantifiers: ItemQuantifierDef[] }> {
  if (!USE_QUEREUS) return { id: `mock-item-${Date.now()}`, quantifiers: [] };
  await ensureDatabaseInitialized();
  const id = await dbCatalog.upsertItem({
    name: input.name,
    typeName: input.typeName,
    categoryName: input.categoryName,
    quantifiers: (input.quantifiers ?? []).map((q) => ({ name: q.name, minValue: q.minValue, maxValue: q.maxValue, units: q.units })),
  });
  return { id, quantifiers: await getItemQuantifiers(id) };
}

export async function getBundleItemIds(bundleId: string): Promise<string[]> {
  if (!USE_QUEREUS) return [];
  await ensureDatabaseInitialized();
  return dbCatalog.getBundleItemIds(bundleId);
}

export async function getEditEntryStats(): Promise<EditEntryStats> {
  if (USE_QUEREUS) {
    await ensureDatabaseInitialized();
    // Not used by the current screen implementation (it calls getTypeStats/getCategoryStats/getItemStats directly).
    // Provide a minimal shape for any future callers.
    const typeStats = await dbStats.getTypeStats();
    return { typeStats, categoryStats: {}, itemStats: {} };
  }

  const variant = getVariant();
  // Treat "error" as a data failure for stats too (keeps behavior consistent).
  if (variant === 'error') {
    throw new Error('mock:error');
  }
  return loadStatsMock(variant);
}

export async function getTypeStats(): Promise<StatRow[]> {
  if (USE_QUEREUS) {
    await ensureDatabaseInitialized();
    return dbStats.getTypeStats();
  }
  return (await getEditEntryStats()).typeStats ?? [];
}


export async function createLogEntry(_data: unknown): Promise<{ success: true; entryId: string }> {
  if (!USE_QUEREUS) {
    // Mock mode: accept and pretend success (UI development/scenarios).
    return { success: true, entryId: `mock-${Date.now()}` };
  }

  await ensureDatabaseInitialized();
  const payload = _data as { timestamp: string; typeId: string; comment: string | null; items: SaveItem[] };
  const entryId = await dbLogEntries.createLogEntry({
    timestamp: payload.timestamp,
    typeId: payload.typeId,
    comment: payload.comment ?? null,
    items: (payload.items ?? []).map((it) => ({ itemId: it.itemId, sourceBundleId: it.sourceBundleId, quantifiers: it.quantifiers })),
  });
  return { success: true, entryId };
}

export async function updateLogEntry(_entryId: string, _data: unknown): Promise<{ success: true }> {
  if (!USE_QUEREUS) {
    return { success: true };
  }

  await ensureDatabaseInitialized();
  const payload = _data as { timestamp: string; typeId: string; comment: string | null; items: SaveItem[] };
  await dbLogEntries.updateLogEntry(_entryId, {
    timestamp: payload.timestamp,
    typeId: payload.typeId,
    comment: payload.comment ?? null,
    items: (payload.items ?? []).map((it) => ({ itemId: it.itemId, sourceBundleId: it.sourceBundleId, quantifiers: it.quantifiers })),
  });
  return { success: true };
}

export async function deleteLogEntry(_entryId: string): Promise<{ success: true }> {
  if (!USE_QUEREUS) {
    return { success: true };
  }
  await ensureDatabaseInitialized();
  await dbLogEntries.deleteLogEntry(_entryId);
  return { success: true };
}


