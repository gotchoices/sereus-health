import { getDatabase } from './index';
import { getAllLogEntries } from './logEntries';

// Dev-only micro-benchmark comparing ways to fetch the full log history
// (entries → items → quantifiers). Run from Settings → Debug. Times three shapes
// on the current dataset so we can pick before adding a fetch limit.

export type BenchResult = {
  label: string;
  ms: number;
  entries: number;
  items: number;
  quants: number;
  error?: string;
};

async function timeIt(
  label: string,
  fn: () => Promise<{ entries: number; items: number; quants: number }>,
): Promise<BenchResult> {
  try {
    const t0 = Date.now();
    const counts = await fn();
    return { label, ms: Date.now() - t0, ...counts };
  } catch (e) {
    return { label, ms: -1, entries: 0, items: 0, quants: 0, error: e instanceof Error ? e.message : String(e) };
  }
}

/** Baseline: the current N+1 (×M) approach — 1 entries query + 1 items query per
 *  entry + 1 quantifiers query per item. */
export async function benchCurrentNPlus1(): Promise<BenchResult> {
  return timeIt('A · Current (N+1 per-entry/per-item)', async () => {
    const entries = await getAllLogEntries();
    let items = 0;
    let quants = 0;
    for (const e of entries) {
      items += e.items.length;
      for (const it of e.items) quants += it.quantifiers.length;
    }
    return { entries: entries.length, items, quants };
  });
}

/** Nested in the DB: one query; Quereus collapses items + quantifiers into native
 *  arrays via json_group_array (correlated sub-selects). */
export async function benchDbNested(): Promise<BenchResult> {
  return timeIt('B · DB-nested (single json_group_array query)', async () => {
    const db = await getDatabase();
    const sql = `
      SELECT
        e.id AS id,
        e.timestamp AS ts,
        t.name AS typeName,
        e.comment AS comment,
        e.event_utc_offset_minutes AS off,
        (SELECT json_group_array(json_object(
            'itemId', i.id,
            'name', i.name,
            'categoryName', c.name,
            'sourceBundleId', lei.source_bundle_id,
            'quantifiers', (
              SELECT json_group_array(json_object(
                'id', q.id, 'name', q.name, 'value', qv.value,
                'units', q.units, 'minValue', q.min_value, 'maxValue', q.max_value))
              FROM log_entry_quantifier_values qv
              JOIN item_quantifiers q ON q.id = qv.quantifier_id
              WHERE qv.entry_id = e.id AND qv.item_id = i.id)))
         FROM log_entry_items lei
         JOIN items i ON i.id = lei.item_id
         JOIN categories c ON c.id = i.category_id
         WHERE lei.entry_id = e.id) AS items
      FROM log_entries e
      JOIN types t ON t.id = e.type_id
      ORDER BY e.timestamp DESC
    `;
    let entries = 0;
    let items = 0;
    let quants = 0;
    for await (const row of db.eval(sql)) {
      entries++;
      const raw = (row as any).items;
      const its: any[] = Array.isArray(raw) ? raw : typeof raw === 'string' ? JSON.parse(raw) : [];
      items += its.length;
      for (const it of its) {
        const qs = it.quantifiers;
        const arr = Array.isArray(qs) ? qs : typeof qs === 'string' ? JSON.parse(qs) : [];
        quants += arr.length;
      }
    }
    return { entries, items, quants };
  });
}

/** Nested locally: three flat set-based queries, assembled/nested in JS. */
export async function benchLocalNested(): Promise<BenchResult> {
  return timeIt('C · Local-nested (3 flat queries + JS assembly)', async () => {
    const db = await getDatabase();

    type EntryRow = { id: string; items: any[] };
    const entries: EntryRow[] = [];
    const byId = new Map<string, EntryRow>();
    for await (const r of db.eval(
      `SELECT e.id AS id, e.timestamp AS ts, t.name AS typeName, e.comment AS comment,
              e.event_utc_offset_minutes AS off
       FROM log_entries e JOIN types t ON t.id = e.type_id
       ORDER BY e.timestamp DESC`,
    )) {
      const row = { id: r.id as string, items: [] as any[] };
      entries.push(row);
      byId.set(row.id, row);
    }

    // Items — one scan; bucket by entry.
    const itemByKey = new Map<string, any>(); // `${entryId}|${itemId}` -> item (with quantifiers[])
    let items = 0;
    for await (const r of db.eval(
      `SELECT lei.entry_id AS entryId, i.id AS itemId, i.name AS itemName,
              c.name AS categoryName, lei.source_bundle_id AS sourceBundleId
       FROM log_entry_items lei JOIN items i ON i.id = lei.item_id JOIN categories c ON c.id = i.category_id`,
    )) {
      const it = {
        itemId: r.itemId as string,
        name: r.itemName as string,
        categoryName: r.categoryName as string,
        sourceBundleId: (r.sourceBundleId as string) ?? null,
        quantifiers: [] as any[],
      };
      items++;
      byId.get(r.entryId as string)?.items.push(it);
      itemByKey.set(`${r.entryId}|${r.itemId}`, it);
    }

    // Quantifier values — one scan; attach to items.
    let quants = 0;
    for await (const r of db.eval(
      `SELECT qv.entry_id AS entryId, qv.item_id AS itemId, q.id AS quantId, q.name AS quantName,
              qv.value AS val, q.units AS units, q.min_value AS minValue, q.max_value AS maxValue
       FROM log_entry_quantifier_values qv JOIN item_quantifiers q ON q.id = qv.quantifier_id`,
    )) {
      const it = itemByKey.get(`${r.entryId}|${r.itemId}`);
      if (it) {
        it.quantifiers.push({
          id: r.quantId as string, name: r.quantName as string, value: r.val as number,
          units: (r.units as string) ?? null, minValue: (r.minValue as number) ?? null, maxValue: (r.maxValue as number) ?? null,
        });
        quants++;
      }
    }

    return { entries: entries.length, items, quants };
  });
}

/** Run all three (warm the path first). Order: local, DB, current-baseline last. */
export async function runQueryBenchmarks(): Promise<BenchResult[]> {
  const db = await getDatabase();
  try {
    for await (const _ of db.eval('SELECT count(*) AS n FROM log_entries')) {
      /* warmup */
    }
  } catch {
    /* ignore warmup errors */
  }
  const results: BenchResult[] = [];
  results.push(await benchLocalNested());
  results.push(await benchDbNested());
  results.push(await benchCurrentNPlus1());
  return results;
}

export function formatBenchResults(results: BenchResult[]): string {
  return results
    .map((r) =>
      r.error
        ? `${r.label}\n   ERROR: ${r.error}`
        : `${r.label}\n   ${r.ms} ms · ${r.entries} entries, ${r.items} items, ${r.quants} quants`,
    )
    .join('\n\n');
}
