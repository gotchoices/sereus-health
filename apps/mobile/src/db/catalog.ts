import type { Database } from '@quereus/quereus';
import { getDatabase } from './index';
import { newUuid } from '../util/id';

export interface InsertCatalogItemInput {
  typeName: string;
  categoryName: string;
  itemName: string;
}

async function getOrCreateType(db: Database, typeName: string): Promise<string> {
  const stmt = await db.prepare('SELECT id FROM types WHERE name = ?');
  const row = await stmt.get([typeName]);
  await stmt.finalize();
  if (row) return row.id as string;

  const id = newUuid();
  await db.exec('INSERT INTO types (id, name, display_order) VALUES (?, ?, ?)', [id, typeName, 999]);
  return id;
}

async function getOrCreateCategory(db: Database, categoryName: string, typeId: string): Promise<string> {
  const stmt = await db.prepare('SELECT id FROM categories WHERE name = ? AND type_id = ?');
  const row = await stmt.get([categoryName, typeId]);
  await stmt.finalize();
  if (row) return row.id as string;

  const id = newUuid();
  await db.exec('INSERT INTO categories (id, name, type_id) VALUES (?, ?, ?)', [id, categoryName, typeId]);
  return id;
}

async function getOrCreateItem(db: Database, itemName: string, categoryId: string): Promise<{ id: string; created: boolean }> {
  const stmt = await db.prepare('SELECT id FROM items WHERE name = ? AND category_id = ?');
  const row = await stmt.get([itemName, categoryId]);
  await stmt.finalize();
  if (row) return { id: row.id as string, created: false };

  const id = newUuid();
  await db.exec('INSERT INTO items (id, name, category_id) VALUES (?, ?, ?)', [id, itemName, categoryId]);
  return { id, created: true };
}

export async function insertCatalogItem(input: InsertCatalogItemInput): Promise<string> {
  const db = await getDatabase();
  const typeId = await getOrCreateType(db, input.typeName);
  const categoryId = await getOrCreateCategory(db, input.categoryName, typeId);
  const { id } = await getOrCreateItem(db, input.itemName, categoryId);
  return id;
}

export async function getCategoriesForType(typeName: string): Promise<Array<{ id: string; name: string }>> {
  const db = await getDatabase();
  const typeStmt = await db.prepare('SELECT id FROM types WHERE name = ?');
  const typeRow = await typeStmt.get([typeName]);
  await typeStmt.finalize();
  if (!typeRow) return [];

  const stmt = await db.prepare('SELECT id, name FROM categories WHERE type_id = ? ORDER BY name ASC');
  const rows: any[] = [];
  for await (const r of stmt.all([typeRow.id as string])) rows.push(r);
  await stmt.finalize();
  return rows.map((r) => ({ id: r.id as string, name: r.name as string }));
}

export async function getItemDetail(itemId: string): Promise<{
  id: string;
  name: string;
  description: string | null;
  type: string;
  category: string;
  quantifiers: Array<{ id: string; name: string; minValue: number | null; maxValue: number | null; units: string | null }>;
} | null> {
  const db = await getDatabase();
  const stmt = await db.prepare(`
    SELECT 
      i.id,
      i.name,
      i.description,
      t.name as type,
      c.name as category
    FROM items i
    JOIN categories c ON c.id = i.category_id
    JOIN types t ON t.id = c.type_id
    WHERE i.id = ?
  `);
  const row = await stmt.get([itemId]);
  await stmt.finalize();
  if (!row) return null;

  const qStmt = await db.prepare(`
    SELECT id, name, min_value as minValue, max_value as maxValue, units
    FROM item_quantifiers
    WHERE item_id = ?
    ORDER BY name ASC
  `);
  const qs: any[] = [];
  for await (const r of qStmt.all([itemId])) qs.push(r);
  await qStmt.finalize();

  return {
    id: row.id as string,
    name: row.name as string,
    description: (row.description as string) ?? null,
    type: row.type as string,
    category: row.category as string,
    quantifiers: qs.map((q) => ({
      id: q.id as string,
      name: q.name as string,
      minValue: (q.minValue as number) ?? null,
      maxValue: (q.maxValue as number) ?? null,
      units: (q.units as string) ?? null,
    })),
  };
}

export async function upsertItem(input: {
  id?: string;
  name: string;
  description?: string | null;
  typeName: string;
  categoryName: string;
  quantifiers: Array<{ id?: string; name: string; minValue?: number; maxValue?: number; units?: string }>;
}): Promise<string> {
  const db = await getDatabase();
  const typeId = await getOrCreateType(db, input.typeName);
  const categoryId = await getOrCreateCategory(db, input.categoryName, typeId);
  const itemId = input.id ?? newUuid();

  await db.exec('BEGIN');
  try {
    const existsStmt = await db.prepare('SELECT id FROM items WHERE id = ?');
    const exists = await existsStmt.get([itemId]);
    await existsStmt.finalize();

    if (exists) {
      await db.exec('UPDATE items SET name = ?, description = ?, category_id = ? WHERE id = ?', [
        input.name,
        input.description ?? null,
        categoryId,
        itemId,
      ]);
    } else {
      await db.exec('INSERT INTO items (id, name, description, category_id) VALUES (?, ?, ?, ?)', [
        itemId,
        input.name,
        input.description ?? null,
        categoryId,
      ]);
    }

    // Quantifiers: replace-all strategy (Phase 1)
    await db.exec('DELETE FROM item_quantifiers WHERE item_id = ?', [itemId]);
    for (const q of input.quantifiers) {
      await db.exec('INSERT INTO item_quantifiers (id, item_id, name, min_value, max_value, units) VALUES (?, ?, ?, ?, ?, ?)', [
        q.id ?? newUuid(),
        itemId,
        q.name,
        q.minValue ?? null,
        q.maxValue ?? null,
        q.units ?? null,
      ]);
    }

    await db.exec('COMMIT');
    return itemId;
  } catch (e) {
    await db.exec('ROLLBACK');
    throw e;
  }
}

export async function getAllCatalogItems(): Promise<Array<{ id: string; name: string; type: string; category: string }>> {
  const db = await getDatabase();
  const stmt = await db.prepare(`
    SELECT 
      i.id,
      i.name,
      t.name as type,
      c.name as category
    FROM items i
    JOIN categories c ON c.id = i.category_id
    JOIN types t ON t.id = c.type_id
    ORDER BY t.display_order, c.name, i.name
  `);

  const rows: any[] = [];
  for await (const row of stmt.all()) rows.push(row);
  await stmt.finalize();

  return rows.map((r) => ({
    id: r.id as string,
    name: r.name as string,
    type: r.type as string,
    category: r.category as string,
  }));
}

export async function getAllCatalogBundles(): Promise<Array<{ id: string; name: string; type: string; itemIds: string[] }>> {
  const db = await getDatabase();
  const bundleStmt = await db.prepare(`
    SELECT 
      b.id,
      b.name,
      t.name as type
    FROM bundles b
    LEFT JOIN types t ON t.id = b.type_id
    ORDER BY b.name
  `);

  const bundles: any[] = [];
  for await (const row of bundleStmt.all()) bundles.push(row);
  await bundleStmt.finalize();

  const out: Array<{ id: string; name: string; type: string; itemIds: string[] }> = [];
  for (const b of bundles) {
    const itemStmt = await db.prepare('SELECT item_id FROM bundle_members WHERE bundle_id = ?');
    const itemIds: string[] = [];
    for await (const r of itemStmt.all([b.id as string])) itemIds.push(r.item_id as string);
    await itemStmt.finalize();

    out.push({
      id: b.id as string,
      name: b.name as string,
      type: (b.type as string) || 'Activity',
      itemIds,
    });
  }
  return out;
}


