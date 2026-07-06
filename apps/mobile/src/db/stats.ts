import { getDatabase } from './index';

export interface TypeStat {
  id: string;
  name: string;
  usageCount: number;
}

export async function getTypeStats(): Promise<TypeStat[]> {
  const db = await getDatabase();
  const stmt = await db.prepare(`
    SELECT 
      t.id,
      t.name,
      count(e.id) as usageCount
    FROM types t
    LEFT JOIN log_entries e ON e.type_id = t.id
    GROUP BY t.id, t.name
    ORDER BY usageCount DESC, t.name ASC
  `);
  const rows: any[] = [];
  for await (const r of stmt.all()) rows.push(r);
  await stmt.finalize();
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

/** All active items (across every category) and bundles for a Type — for the logging item picker. */
export async function getItemsForType(typeId: string): Promise<TypeItemRow[]> {
  const db = await getDatabase();

  const itemStmt = await db.prepare(`
    SELECT i.id AS itemId, i.name AS itemName, c.id AS categoryId, c.name AS categoryName,
      (SELECT count(*) FROM log_entry_items lei WHERE lei.item_id = i.id) AS usageCount
    FROM items i
    JOIN categories c ON c.id = i.category_id
    WHERE c.type_id = ?
  `);
  const itemRows: any[] = [];
  for await (const r of itemStmt.all([typeId])) itemRows.push(r);
  await itemStmt.finalize();

  const bundleStmt = await db.prepare(`
    SELECT b.id AS bundleId, b.name AS bundleName,
      (SELECT count(*) FROM log_entry_items lei WHERE lei.source_bundle_id = b.id) AS usageCount
    FROM bundles b
    WHERE b.type_id = ?
  `);
  const bundleRows: any[] = [];
  for await (const r of bundleStmt.all([typeId])) bundleRows.push(r);
  await bundleStmt.finalize();

  const combined: TypeItemRow[] = [
    ...itemRows.map((r) => ({
      id: r.itemId as string, name: r.itemName as string, usageCount: (r.usageCount as number) || 0,
      isBundle: false, categoryId: r.categoryId as string, categoryName: r.categoryName as string,
    })),
    ...bundleRows.map((r) => ({
      id: r.bundleId as string, name: r.bundleName as string, usageCount: (r.usageCount as number) || 0,
      isBundle: true, categoryId: null, categoryName: null,
    })),
  ];
  combined.sort((a, b) => (b.usageCount !== a.usageCount ? b.usageCount - a.usageCount : a.name.localeCompare(b.name)));
  return combined;
}



