import { getDatabase } from './index';

export interface TypeStat {
  id: string;
  name: string;
  usageCount: number;
}

export async function getTypeStats(): Promise<TypeStat[]> {
  const db = await getDatabase();
  const rows: any[] = [];
  for await (const r of db.eval(`
    SELECT
      t.id,
      t.name,
      count(e.id) as usageCount
    FROM types t
    LEFT JOIN log_entries e ON e.type_id = t.id
    GROUP BY t.id, t.name
    ORDER BY usageCount DESC, t.name ASC
  `)) {
    rows.push(r);
  }
  return rows.map((r) => ({ id: r.id as string, name: r.name as string, usageCount: (r.usageCount as number) || 0 }));
}

export interface TypeItemRow {
  id: string;
  name: string;
  usageCount: number;
  isBundle: boolean;
  categoryId: string | null;
  categoryName: string | null;
}

/** Run a `SELECT key, count(*)` grouped query into a Map<key, count>. Set-based —
 *  replaces per-row scalar `(SELECT count(*) …)` subqueries, which execute once
 *  per output row (~40× slower at catalog scale; see db/bench.ts). */
async function countMap(db: Awaited<ReturnType<typeof getDatabase>>, sql: string, params: any[]): Promise<Map<string, number>> {
  const m = new Map<string, number>();
  for await (const r of db.eval(sql, params)) {
    if (r.id != null) m.set(r.id as string, (r.n as number) || 0);
  }
  return m;
}

// STACK-WORKAROUND(W1): single-table queries instead of the natural join (docs/stack-workarounds.md).
/** All active items (across every category) and bundles for a Type — for the logging item picker.
 *
 *  PERF: every query here reads ONE table, with the per-type filtering done in JS.  On the
 *  optimystic strand a join plans as a nested loop — a scan of one table plus a primary-key
 *  lookup into the other per row — and each lookup costs a block read whose coordinator
 *  routing grows with every connected cadre node (optimystic: per-read cohort assembly).
 *  Measured in Node on the real backup (tmp/query-perf): the joined usage count took
 *  126 ms solo and 325-372 ms with two nodes; these single-table scans take 2-9 ms either way. */
export async function getItemsForType(typeId: string): Promise<TypeItemRow[]> {
  const db = await getDatabase();

  // The Type's categories (few rows), then every item, kept when its category is one of them.
  const categoryNames = new Map<string, string>();
  for await (const r of db.eval(`SELECT id, name FROM categories WHERE type_id = ?`, [typeId])) {
    categoryNames.set(r.id as string, r.name as string);
  }
  const itemRows: any[] = [];
  for await (const r of db.eval(`SELECT id AS itemId, name AS itemName, category_id AS categoryId FROM items`)) {
    const categoryName = categoryNames.get(r.categoryId as string);
    if (categoryName !== undefined) itemRows.push({ ...r, categoryName });
  }
  // Usage per item across all entries; only this Type's items are looked up below.
  const itemUsage = await countMap(db, `
    SELECT item_id AS id, count(*) AS n FROM log_entry_items GROUP BY item_id
  `, []);

  // Bundles (flat) + usage per bundle across all entries.
  const bundleRows: any[] = [];
  for await (const r of db.eval(`
    SELECT b.id AS bundleId, b.name AS bundleName FROM bundles b WHERE b.type_id = ?
  `, [typeId])) {
    bundleRows.push(r);
  }
  const bundleUsage = await countMap(db, `
    SELECT source_bundle_id AS id, count(*) AS n FROM log_entry_items
    WHERE source_bundle_id IS NOT NULL GROUP BY source_bundle_id
  `, []);

  const combined: TypeItemRow[] = [
    ...itemRows.map((r) => ({
      id: r.itemId as string, name: r.itemName as string, usageCount: itemUsage.get(r.itemId as string) || 0,
      isBundle: false, categoryId: r.categoryId as string, categoryName: r.categoryName as string,
    })),
    ...bundleRows.map((r) => ({
      id: r.bundleId as string, name: r.bundleName as string, usageCount: bundleUsage.get(r.bundleId as string) || 0,
      isBundle: true, categoryId: null, categoryName: null,
    })),
  ];
  combined.sort((a, b) => (b.usageCount !== a.usageCount ? b.usageCount - a.usageCount : a.name.localeCompare(b.name)));
  return combined;
}



