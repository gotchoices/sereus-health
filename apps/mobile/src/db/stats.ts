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

/** All active items (across every category) and bundles for a Type — for the logging item picker. */
export async function getItemsForType(typeId: string): Promise<TypeItemRow[]> {
  const db = await getDatabase();

  // Items (flat) + one grouped usage-count query, joined in JS.
  const itemRows: any[] = [];
  for await (const r of db.eval(`
    SELECT i.id AS itemId, i.name AS itemName, c.id AS categoryId, c.name AS categoryName
    FROM items i JOIN categories c ON c.id = i.category_id
    WHERE c.type_id = ?
  `, [typeId])) {
    itemRows.push(r);
  }
  const itemUsage = await countMap(db, `
    SELECT lei.item_id AS id, count(*) AS n
    FROM log_entry_items lei JOIN items i ON i.id = lei.item_id JOIN categories c ON c.id = i.category_id
    WHERE c.type_id = ? GROUP BY lei.item_id
  `, [typeId]);

  // Bundles (flat) + one grouped usage-count query.
  const bundleRows: any[] = [];
  for await (const r of db.eval(`
    SELECT b.id AS bundleId, b.name AS bundleName FROM bundles b WHERE b.type_id = ?
  `, [typeId])) {
    bundleRows.push(r);
  }
  const bundleUsage = await countMap(db, `
    SELECT lei.source_bundle_id AS id, count(*) AS n
    FROM log_entry_items lei JOIN bundles b ON b.id = lei.source_bundle_id
    WHERE b.type_id = ? GROUP BY lei.source_bundle_id
  `, [typeId]);

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



