import type { Database } from '@quereus/quereus';
import { getDatabase } from './index';
import { newUuid } from '../util/id';
import { createLogger } from '../util/logger';

const logger = createLogger('DB Catalog');

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
  if (__DEV__) {
    logger.info('getItemDetail', { itemId, description: (row.description as string) ?? null });
  }

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

// ── Canonical catalog import ─────────────────────────────────────────────────
// Shape per design/specs/domain/import-export.md (name-referenced).

export interface CanonicalCatalog {
  version?: number;
  name?: string;
  description?: string;
  catalog: {
    types?: Array<{ name: string; color?: string; displayOrder?: number }>;
    categories?: Array<{ typeName: string; name: string }>;
    items?: Array<{
      categoryName: string;
      name: string;
      description?: string;
      typeName?: string;
      quantifiers?: Array<{ name: string; units?: string; minValue?: number; maxValue?: number }>;
    }>;
    bundles?: Array<{ typeName?: string; name: string; members?: Array<{ itemName?: string }> }>;
  };
}

export interface CatalogImportResult {
  typesAdd: number;
  categoriesAdd: number;
  itemsAdd: number;
  itemsSkip: number;
  quantifiersAdd: number;
  bundlesAdd: number;
  bundlesSkip: number;
  warnings: string[];
}

/** Number of Types — used to detect an empty (first-run) catalog. */
export async function getTypeCount(): Promise<number> {
  const db = await getDatabase();
  try {
    let count = 0;
    for await (const row of db.eval('SELECT COUNT(*) as count FROM types')) count = (row.count as number) || 0;
    return count;
  } catch {
    // Table not queryable yet on a fresh DB → treat as empty (show onboarding).
    return 0;
  }
}

/**
 * Import a canonical catalog. Idempotent: existing types/categories/items are
 * reused, not duplicated. `dryRun: true` computes the add/skip counts without
 * writing (for preview-before-commit); `dryRun: false` writes in one transaction.
 */
export async function importCanonicalCatalog(
  cat: CanonicalCatalog,
  opts: { dryRun: boolean },
): Promise<CatalogImportResult> {
  const db = await getDatabase();
  const c = cat.catalog ?? ({} as CanonicalCatalog['catalog']);
  const write = !opts.dryRun;
  const res: CatalogImportResult = {
    typesAdd: 0, categoriesAdd: 0, itemsAdd: 0, itemsSkip: 0,
    quantifiersAdd: 0, bundlesAdd: 0, bundlesSkip: 0, warnings: [],
  };

  const SEP = ' ';
  // category name -> type name, from the catalog's own categories (helps resolve items)
  const catCategoryType = new Map<string, string>();
  for (const cg of c.categories ?? []) if (cg?.name && cg?.typeName) catCategoryType.set(cg.name, cg.typeName);

  // Snapshot existing names (also the working set — mutated as we add, so dry-run counts are accurate).
  const typeId = new Map<string, string>();        // typeName -> id
  const catId = new Map<string, string>();         // `${typeId}\0${catName}` -> id
  const itemSeen = new Set<string>();              // `${catId}\0${itemName}`
  const bundleSeen = new Set<string>();            // `${typeId}\0${bundleName}`
  {
    const s = await db.prepare('SELECT id, name FROM types');
    for await (const r of s.all()) typeId.set(r.name as string, r.id as string);
    await s.finalize();
  }
  {
    const s = await db.prepare('SELECT id, name, type_id FROM categories');
    for await (const r of s.all()) catId.set(`${r.type_id as string}${SEP}${r.name as string}`, r.id as string);
    await s.finalize();
  }
  {
    const s = await db.prepare('SELECT name, category_id FROM items');
    for await (const r of s.all()) itemSeen.add(`${r.category_id as string}${SEP}${r.name as string}`);
    await s.finalize();
  }
  {
    const s = await db.prepare('SELECT name, type_id FROM bundles');
    for await (const r of s.all()) bundleSeen.add(`${r.type_id as string}${SEP}${r.name as string}`);
    await s.finalize();
  }

  const ensureType = async (name: string): Promise<string> => {
    const existing = typeId.get(name);
    if (existing) return existing;
    const id = newUuid();
    if (write) await db.exec('INSERT INTO types (id, name, display_order) VALUES (?, ?, ?)', [id, name, 999]);
    typeId.set(name, id);
    res.typesAdd++;
    return id;
  };
  const ensureCategory = async (name: string, tId: string): Promise<string> => {
    const key = `${tId}${SEP}${name}`;
    const existing = catId.get(key);
    if (existing) return existing;
    const id = newUuid();
    if (write) await db.exec('INSERT INTO categories (id, name, type_id) VALUES (?, ?, ?)', [id, name, tId]);
    catId.set(key, id);
    res.categoriesAdd++;
    return id;
  };

  if (write) await db.exec('BEGIN');
  try {
    for (const tp of c.types ?? []) {
      if (tp?.name) await ensureType(tp.name);
    }
    for (const cg of c.categories ?? []) {
      if (!cg?.name || !cg?.typeName) continue;
      await ensureCategory(cg.name, await ensureType(cg.typeName));
    }
    for (const it of c.items ?? []) {
      if (!it?.name || !it?.categoryName) { res.warnings.push(`Item skipped (missing name/category)`); continue; }
      const tName = it.typeName ?? catCategoryType.get(it.categoryName);
      if (!tName) { res.warnings.push(`Item "${it.name}": no type for category "${it.categoryName}"`); continue; }
      const tId = await ensureType(tName);
      const cId = await ensureCategory(it.categoryName, tId);
      const iKey = `${cId}${SEP}${it.name}`;
      if (itemSeen.has(iKey)) { res.itemsSkip++; continue; }
      const iId = newUuid();
      if (write) await db.exec('INSERT INTO items (id, name, description, category_id) VALUES (?, ?, ?, ?)', [iId, it.name, it.description ?? null, cId]);
      itemSeen.add(iKey);
      res.itemsAdd++;
      for (const q of it.quantifiers ?? []) {
        if (!q?.name) continue;
        if (write) await db.exec('INSERT INTO item_quantifiers (id, item_id, name, min_value, max_value, units) VALUES (?, ?, ?, ?, ?, ?)', [newUuid(), iId, q.name, q.minValue ?? null, q.maxValue ?? null, q.units ?? null]);
        res.quantifiersAdd++;
      }
    }
    for (const b of c.bundles ?? []) {
      if (!b?.name) continue;
      if (!b.typeName) { res.warnings.push(`Bundle "${b.name}" skipped (no typeName)`); res.bundlesSkip++; continue; }
      const tId = await ensureType(b.typeName);
      const bKey = `${tId}${SEP}${b.name}`;
      if (bundleSeen.has(bKey)) { res.bundlesSkip++; continue; }
      const bId = newUuid();
      if (write) {
        await db.exec('INSERT INTO bundles (id, name, type_id) VALUES (?, ?, ?)', [bId, b.name, tId]);
        let order = 0;
        for (const m of b.members ?? []) {
          if (!m?.itemName) continue;
          const is = await db.prepare('SELECT i.id FROM items i JOIN categories c ON c.id = i.category_id WHERE i.name = ? AND c.type_id = ? LIMIT 1');
          const ir = await is.get([m.itemName, tId]);
          await is.finalize();
          if (ir) await db.exec('INSERT INTO bundle_members (id, bundle_id, item_id, display_order) VALUES (?, ?, ?, ?)', [newUuid(), bId, ir.id as string, order++]);
          else res.warnings.push(`Bundle "${b.name}": item "${m.itemName}" not found`);
        }
      }
      bundleSeen.add(bKey);
      res.bundlesAdd++;
    }
    if (write) await db.exec('COMMIT');
  } catch (e) {
    if (write) await db.exec('ROLLBACK');
    throw e;
  }
  return res;
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


