import { USE_QUEREUS } from '../db/config';
import { ensureDatabaseInitialized } from '../db/init';
import {
  getAllCatalogBundles,
  importCanonicalCatalog,
  type CanonicalCatalog,
} from '../db/catalog';
import { getAllLogEntries, createLogEntriesBulk, type CreateLogEntryInput } from '../db/logEntries';
import { clearAllData } from '../db/clear';
import { getDatabase } from '../db';

export interface BackupData {
  version: number;
  exportedAtUtc: string;
  catalog: {
    types: Array<{ name: string }>;
    categories: Array<{ typeName: string; name: string }>;
    items: Array<{
      typeName: string;
      categoryName: string;
      name: string;
      description?: string;
      quantifiers?: Array<{
        name: string;
        minValue?: number;
        maxValue?: number;
        units?: string;
      }>;
    }>;
    bundles: Array<{
      typeName: string;
      name: string;
      itemNames: string[];
    }>;
  };
  logs: Array<{
    timestampUtc: string;
    /** Originating-zone offset (minutes; local = UTC + offset) — preserved so a
     *  restored entry still displays in the zone it was logged in. */
    eventUtcOffsetMinutes?: number | null;
    typeName: string;
    items: Array<{
      categoryName: string;
      itemName: string;
      quantifiers?: Array<{
        name: string;
        value: number;
        units?: string;
      }>;
    }>;
    comment?: string;
  }>;
  settings: Record<string, any>;
}

/**
 * Export all app data for backup (YAML format per design/specs/domain/import-export.md).
 * Aims to be lossless for a device move: taxonomy (incl. empty categories),
 * item quantifier definitions, bundles, and log entries with their originating
 * zone offset. (Retired state and settings are not yet captured — see the
 * generated spec.)
 */
export async function exportBackup(): Promise<BackupData> {
  if (!USE_QUEREUS) {
    return {
      version: 1,
      exportedAtUtc: new Date().toISOString(),
      catalog: { types: [], categories: [], items: [], bundles: [] },
      logs: [],
      settings: {},
    };
  }

  await ensureDatabaseInitialized();
  const db = await getDatabase();

  // Authoritative types + categories straight from the tables, so **empty**
  // categories (and item-less types) survive the round-trip.
  const types: Array<{ name: string }> = [];
  for await (const r of db.eval('SELECT name FROM types ORDER BY display_order, name')) {
    types.push({ name: r.name as string });
  }
  const categories: Array<{ typeName: string; name: string }> = [];
  for await (const r of db.eval(
    'SELECT c.name AS categoryName, t.name AS typeName FROM categories c JOIN types t ON t.id = c.type_id ORDER BY t.name, c.name',
  )) {
    categories.push({ typeName: r.typeName as string, name: r.categoryName as string });
  }

  // Items + quantifier definitions, batched (2 flat queries + JS assembly) rather
  // than getItemDetail per item (which was the same N+1 that made export slow).
  type ItemDef = {
    id: string;
    typeName: string;
    categoryName: string;
    name: string;
    description?: string;
    quantifiers: Array<{ name: string; minValue?: number; maxValue?: number; units?: string }>;
  };
  const itemDefs = new Map<string, ItemDef>();
  for await (const r of db.eval(`
    SELECT i.id AS id, i.name AS name, i.description AS description, t.name AS typeName, c.name AS categoryName
    FROM items i JOIN categories c ON c.id = i.category_id JOIN types t ON t.id = c.type_id
    ORDER BY t.display_order, c.name, i.name
  `)) {
    itemDefs.set(r.id as string, {
      id: r.id as string,
      typeName: r.typeName as string,
      categoryName: r.categoryName as string,
      name: r.name as string,
      description: (r.description as string) ?? undefined,
      quantifiers: [],
    });
  }
  for await (const r of db.eval(`
    SELECT item_id AS itemId, name AS name, min_value AS minValue, max_value AS maxValue, units AS units
    FROM item_quantifiers ORDER BY name ASC
  `)) {
    const def = itemDefs.get(r.itemId as string);
    if (def) def.quantifiers.push({
      name: r.name as string,
      minValue: (r.minValue as number) ?? undefined,
      maxValue: (r.maxValue as number) ?? undefined,
      units: (r.units as string) ?? undefined,
    });
  }

  const items = Array.from(itemDefs.values()).map((d) => ({
    typeName: d.typeName,
    categoryName: d.categoryName,
    name: d.name,
    description: d.description,
    quantifiers: d.quantifiers.length > 0 ? d.quantifiers : undefined,
  }));

  // Bundles as member item names.
  const bundlesList = await getAllCatalogBundles();
  const itemIdToName = new Map(Array.from(itemDefs.values()).map((d) => [d.id, d.name]));
  const bundles = bundlesList.map((bundle) => ({
    typeName: bundle.type,
    name: bundle.name,
    itemNames: bundle.itemIds.map((id) => itemIdToName.get(id) ?? id),
  }));

  // Log entries (values + originating-zone offset).
  const logsList = await getAllLogEntries();
  const logs = logsList.map((entry) => ({
    timestampUtc: entry.timestamp,
    eventUtcOffsetMinutes: entry.eventUtcOffsetMinutes ?? undefined,
    typeName: entry.typeName,
    items: entry.items.map((item) => ({
      categoryName: item.categoryName,
      itemName: item.name,
      quantifiers:
        item.quantifiers && item.quantifiers.length > 0
          ? item.quantifiers.map((q) => ({ name: q.name, value: q.value, units: q.units ?? undefined }))
          : undefined,
    })),
    comment: entry.comment ?? undefined,
  }));

  return {
    version: 1,
    exportedAtUtc: new Date().toISOString(),
    catalog: { types, categories, items, bundles },
    logs,
    settings: {}, // theme/reminders not yet persisted; API keys deliberately excluded (secure storage).
  };
}

export interface ImportPreview {
  catalogItemsAdd: number;
  catalogItemsUpdate: number;
  catalogItemsSkip: number;
  bundlesAdd: number;
  bundlesUpdate: number;
  bundlesSkip: number;
  logsAdd: number;
  logsUpdate: number;
  logsSkip: number;
  errors: string[];
  warnings: string[];
}

export interface ImportProgress {
  /** Which phase is running. `catalog` reports no count (one atomic insert). */
  phase: 'catalog' | 'entries';
  done: number;
  total: number;
}

export interface ImportOptions {
  mode: 'merge' | 'replace';
  dryRun?: boolean;
  /** Progress callback for the (potentially long) write phases. */
  onProgress?: (p: ImportProgress) => void;
}

function emptyPreview(): ImportPreview {
  return {
    catalogItemsAdd: 0, catalogItemsUpdate: 0, catalogItemsSkip: 0,
    bundlesAdd: 0, bundlesUpdate: 0, bundlesSkip: 0,
    logsAdd: 0, logsUpdate: 0, logsSkip: 0,
    errors: [], warnings: [],
  };
}

/** Idempotency key for a log entry: (timestampUtc, typeName, sorted item names). */
function logKey(timestampUtc: string, typeName: string, itemNames: string[]): string {
  return `${timestampUtc}|${typeName.toLowerCase()}|${itemNames.map((n) => n.toLowerCase()).sort().join(',')}`;
}

/**
 * Import backup data (YAML/JSON canonical form, per import-export.md).
 *
 * - `mode: 'replace'` (non-dry-run) clears all local data first, then imports.
 * - Catalog (types/categories/items[quantifiers]/bundles) reuses the tested
 *   `importCanonicalCatalog` (idempotent by name identity).
 * - Logs are imported here: idempotent by `(timestampUtc, typeName, set(items))`,
 *   resolving item/quantifier ids by name and preserving `eventUtcOffsetMinutes`.
 * - `dryRun: true` computes preview counts without writing.
 */
export async function importBackup(
  backupData: BackupData,
  options: ImportOptions = { mode: 'merge' },
): Promise<ImportPreview> {
  const preview = emptyPreview();

  if (!USE_QUEREUS) {
    preview.warnings.push('Import not supported in mock mode');
    return preview;
  }

  // Validate structure.
  if (!backupData || !backupData.version || !backupData.exportedAtUtc) {
    preview.errors.push('Invalid backup file: missing version or exportedAtUtc');
    return preview;
  }

  await ensureDatabaseInitialized();
  const db = await getDatabase();

  const write = !options.dryRun;

  // Replace mode: clear everything first (real runs only).
  if (options.mode === 'replace' && write) {
    await clearAllData();
  }

  // ── Catalog (reuse the canonical importer) ─────────────────────────────────
  const canonical: CanonicalCatalog = {
    version: backupData.version,
    catalog: {
      types: backupData.catalog?.types ?? [],
      categories: backupData.catalog?.categories ?? [],
      items: (backupData.catalog?.items ?? []).map((it) => ({
        typeName: it.typeName,
        categoryName: it.categoryName,
        name: it.name,
        description: it.description,
        quantifiers: it.quantifiers,
      })),
      bundles: (backupData.catalog?.bundles ?? []).map((b) => ({
        typeName: b.typeName,
        name: b.name,
        members: (b.itemNames ?? []).map((n) => ({ itemName: n })),
      })),
    },
  };
  // Announce the catalog phase and yield once so the UI paints its indicator
  // *before* the (single, atomic) catalog transaction blocks the JS thread. We
  // deliberately do NOT report per-item counts here — that would require yielding
  // inside the open transaction.
  if (write) {
    options.onProgress?.({ phase: 'catalog', done: 0, total: 0 });
    await new Promise<void>((resolve) => setTimeout(resolve, 0));
  }
  const cat = await importCanonicalCatalog(canonical, { dryRun: options.dryRun ?? false });
  preview.catalogItemsAdd = cat.itemsAdd;
  preview.catalogItemsSkip = cat.itemsSkip;
  preview.bundlesAdd = cat.bundlesAdd;
  preview.bundlesSkip = cat.bundlesSkip;
  preview.warnings.push(...cat.warnings);

  // ── Logs ───────────────────────────────────────────────────────────────────
  if (backupData.logs && backupData.logs.length > 0) {
    // Existing keys — after a replace clear this is empty. In merge/dry-run it
    // reflects current data so re-import doesn't duplicate.
    const existing = await getAllLogEntries();
    const seen = new Set(existing.map((e) => logKey(e.timestamp, e.typeName, e.items.map((i) => i.name))));

    // Preload name→id resolution maps ONCE (three queries) instead of the
    // per-entry N+1 lookups that made large restores crawl.
    const SEP = '\u0000';
    const typeIdByName = new Map<string, string>();
    const itemIdByKey = new Map<string, string>(); // `${typeId}${SEP}${categoryName}${SEP}${itemName}`
    const qidByKey = new Map<string, string>(); // `${itemId}${SEP}${quantifierName}`
    {
      const s = await db.prepare('SELECT id, name FROM types');
      for await (const r of s.all()) typeIdByName.set(r.name as string, r.id as string);
      await s.finalize();
    }
    {
      const s = await db.prepare(
        'SELECT i.id AS id, i.name AS itemName, c.name AS categoryName, c.type_id AS typeId FROM items i JOIN categories c ON c.id = i.category_id',
      );
      for await (const r of s.all()) {
        itemIdByKey.set(`${r.typeId as string}${SEP}${r.categoryName as string}${SEP}${r.itemName as string}`, r.id as string);
      }
      await s.finalize();
    }
    {
      const s = await db.prepare('SELECT id, item_id AS itemId, name FROM item_quantifiers');
      for await (const r of s.all()) qidByKey.set(`${r.itemId as string}${SEP}${r.name as string}`, r.id as string);
      await s.finalize();
    }

    // Resolve every backup log into insert-ready input, in memory (no writes),
    // preserving the original skip/warning semantics.
    const toInsert: CreateLogEntryInput[] = [];
    for (const log of backupData.logs) {
      const key = logKey(log.timestampUtc, log.typeName, log.items.map((i) => i.itemName));
      if (seen.has(key)) {
        preview.logsSkip++; // idempotent: entry already present (value/comment updates are a future refinement)
        continue;
      }
      const typeId = typeIdByName.get(log.typeName);
      if (!typeId) {
        preview.warnings.push(`Log ${log.timestampUtc}: unknown type "${log.typeName}" — skipped`);
        preview.logsSkip++;
        continue;
      }
      const items: CreateLogEntryInput['items'] = [];
      for (const it of log.items) {
        const itemId = itemIdByKey.get(`${typeId}${SEP}${it.categoryName}${SEP}${it.itemName}`);
        if (!itemId) {
          preview.warnings.push(`Log ${log.timestampUtc}: item "${it.itemName}" not found — skipped`);
          continue;
        }
        const quantifiers: Array<{ quantifierId: string; value: number }> = [];
        for (const q of it.quantifiers ?? []) {
          const qid = qidByKey.get(`${itemId}${SEP}${q.name}`);
          if (qid) quantifiers.push({ quantifierId: qid, value: q.value });
          else preview.warnings.push(`Log ${log.timestampUtc}: quantifier "${q.name}" on "${it.itemName}" not found — value dropped`);
        }
        items.push({ itemId, sourceBundleId: null, quantifiers });
      }
      if (items.length === 0) {
        preview.errors.push(`Log ${log.timestampUtc}: no resolvable items — skipped`);
        preview.logsSkip++;
        continue;
      }
      seen.add(key);
      if (!write) {
        preview.logsAdd++;
        continue;
      }
      toInsert.push({
        timestamp: log.timestampUtc,
        typeId,
        comment: log.comment ?? null,
        eventUtcOffsetMinutes: log.eventUtcOffsetMinutes ?? null,
        items,
      });
    }

    // Insert in batched transactions (a few commits, not one-per-entry),
    // reporting progress for the UI.
    if (write && toInsert.length > 0) {
      const result = await createLogEntriesBulk(toInsert, {
        onProgress: (done, total) => options.onProgress?.({ phase: 'entries', done, total }),
      });
      preview.logsAdd += result.added;
      preview.errors.push(...result.errors);
    }
  }

  return preview;
}
