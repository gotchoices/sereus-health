import { getDatabase } from './index';

export interface TypeStat {
  id: string;
  name: string;
  usageCount: number;
}

export interface CategoryStat {
  id: string;
  name: string;
  usageCount: number;
}

export interface ItemStat {
  id: string;
  name: string;
  usageCount: number;
  isBundle: boolean;
}

export async function getTypeStats(): Promise<TypeStat[]> {
  const db = await getDatabase();
  const stmt = await db.prepare(`
    SELECT 
      t.id,
      t.name,
      COUNT(e.id) as usageCount
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

export async function getCategoryStats(typeId: string): Promise<CategoryStat[]> {
  const db = await getDatabase();
  const stmt = await db.prepare(`
    SELECT 
      c.id,
      c.name,
      COUNT(DISTINCT e.id) as usageCount
    FROM categories c
    LEFT JOIN items i ON i.category_id = c.id
    LEFT JOIN log_entry_items lei ON lei.item_id = i.id
    LEFT JOIN log_entries e ON e.id = lei.entry_id
    WHERE c.type_id = ?
    GROUP BY c.id, c.name
    ORDER BY usageCount DESC, c.name ASC
  `);
  const rows: any[] = [];
  for await (const r of stmt.all([typeId])) rows.push(r);
  await stmt.finalize();
  return rows.map((r) => ({ id: r.id as string, name: r.name as string, usageCount: (r.usageCount as number) || 0 }));
}

export async function getItemStats(categoryId: string): Promise<ItemStat[]> {
  const db = await getDatabase();

  const itemStmt = await db.prepare(`
    SELECT 
      i.id,
      i.name,
      COUNT(DISTINCT lei.entry_id) as usageCount,
      0 as isBundle
    FROM items i
    LEFT JOIN log_entry_items lei ON lei.item_id = i.id
    WHERE i.category_id = ?
    GROUP BY i.id, i.name
  `);
  const itemRows: any[] = [];
  for await (const r of itemStmt.all([categoryId])) itemRows.push(r);
  await itemStmt.finalize();

  const bundleStmt = await db.prepare(`
    SELECT 
      b.id,
      b.name,
      COUNT(DISTINCT lei.entry_id) as usageCount,
      1 as isBundle
    FROM bundles b
    LEFT JOIN log_entry_items lei ON lei.source_bundle_id = b.id
    GROUP BY b.id, b.name
  `);
  const bundleRows: any[] = [];
  for await (const r of bundleStmt.all()) bundleRows.push(r);
  await bundleStmt.finalize();

  const combined: ItemStat[] = [
    ...itemRows.map((r) => ({ id: r.id as string, name: r.name as string, usageCount: (r.usageCount as number) || 0, isBundle: false })),
    ...bundleRows.map((r) => ({ id: r.id as string, name: r.name as string, usageCount: (r.usageCount as number) || 0, isBundle: true })),
  ];

  combined.sort((a, b) => (b.usageCount !== a.usageCount ? b.usageCount - a.usageCount : a.name.localeCompare(b.name)));
  return combined;
}


