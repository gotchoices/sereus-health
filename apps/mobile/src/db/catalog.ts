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

  // Retired categories are hidden from *future* selection (rules.md); management
  // surfaces (getCategoriesWithCounts) still show them so they can be restored.
  const stmt = await db.prepare('SELECT id, name FROM categories WHERE type_id = ? AND retired_at IS NULL ORDER BY name ASC');
  const rows: any[] = [];
  for await (const r of stmt.all([typeRow.id as string])) rows.push(r);
  await stmt.finalize();
  return rows.map((r) => ({ id: r.id as string, name: r.name as string }));
}

/** All Type names, in display order. Authoritative — independent of whether a
 *  Type yet has items/bundles (a fresh minimal catalog has types+categories only). */
export async function getTypes(): Promise<string[]> {
  const db = await getDatabase();
  const stmt = await db.prepare('SELECT name FROM types ORDER BY display_order, name');
  const out: string[] = [];
  for await (const r of stmt.all()) out.push(r.name as string);
  await stmt.finalize();
  return out;
}

// ── Category management ──────────────────────────────────────────────────────

export interface CategoryRow {
  id: string;
  name: string;
  itemCount: number;
  retired: boolean;
}

/**
 * All categories for a Type — including empty and retired ones — with item
 * counts. This is the only surface that can see empty categories (the Items
 * view groups by category implicitly, so a category with zero items is
 * otherwise invisible). Uses a scalar subquery rather than GROUP BY to avoid
 * Quereus's duplicate-`id`-in-scope error.
 */
export async function getCategoriesWithCounts(typeName: string): Promise<CategoryRow[]> {
  const db = await getDatabase();
  const typeRow = await db.get('SELECT id FROM types WHERE name = ?', [typeName]);
  if (!typeRow) return [];
  const typeId = typeRow.id as string;

  // Item counts per category — one grouped query, not a per-category subquery.
  const counts = new Map<string, number>();
  for await (const r of db.eval(`
    SELECT i.category_id AS id, count(*) AS n
    FROM items i JOIN categories c ON c.id = i.category_id
    WHERE c.type_id = ? GROUP BY i.category_id
  `, [typeId])) {
    if (r.id != null) counts.set(r.id as string, (r.n as number) || 0);
  }

  const rows: CategoryRow[] = [];
  for await (const r of db.eval(`
    SELECT c.id AS id, c.name AS name, c.retired_at AS retiredAt
    FROM categories c
    WHERE c.type_id = ?
    ORDER BY c.name ASC
  `, [typeId])) {
    rows.push({
      id: r.id as string,
      name: r.name as string,
      itemCount: counts.get(r.id as string) ?? 0,
      retired: r.retiredAt != null,
    });
  }
  return rows;
}

/** Create a category under a Type (idempotent by unique `(type_id, name)`). */
export async function createCategory(typeName: string, name: string): Promise<string> {
  const db = await getDatabase();
  const typeId = await getOrCreateType(db, typeName);
  return getOrCreateCategory(db, name, typeId);
}

/** Rename a category. Throws `duplicate-name` if the target name already exists in the Type. */
export async function renameCategory(categoryId: string, newName: string): Promise<void> {
  const db = await getDatabase();
  const curStmt = await db.prepare('SELECT type_id FROM categories WHERE id = ?');
  const cur = await curStmt.get([categoryId]);
  await curStmt.finalize();
  if (!cur) throw new Error('not-found');

  const dupStmt = await db.prepare('SELECT id FROM categories WHERE type_id = ? AND lower(name) = lower(?) AND id != ?');
  const dup = await dupStmt.get([cur.type_id as string, newName, categoryId]);
  await dupStmt.finalize();
  if (dup) throw new Error('duplicate-name');

  await db.exec('UPDATE categories SET name = ? WHERE id = ?', [newName, categoryId]);
}

/** Retire (hide from future selection) or restore a category. */
export async function setCategoryRetired(categoryId: string, retired: boolean): Promise<void> {
  const db = await getDatabase();
  await db.exec('UPDATE categories SET retired_at = ? WHERE id = ?', [
    retired ? new Date().toISOString() : null,
    categoryId,
  ]);
}

/**
 * Hard-delete a category. Only permitted when empty (no items reference it) —
 * otherwise throws `not-empty` and the caller should retire instead (rules.md).
 */
export async function deleteCategory(categoryId: string): Promise<void> {
  const db = await getDatabase();
  const cntStmt = await db.prepare('SELECT count(*) AS n FROM items WHERE category_id = ?');
  const cnt = await cntStmt.get([categoryId]);
  await cntStmt.finalize();
  if (((cnt?.n as number) ?? 0) > 0) throw new Error('not-empty');
  await db.exec('DELETE FROM categories WHERE id = ?', [categoryId]);
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
    WHERE item_id = ? AND retired_at IS NULL
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

  // Snapshot existing quantifier ids BEFORE the transaction. Quereus throws
  // "Path is invalid due to mutation of the tree" on a scanning DELETE
  // (`WHERE item_id = ?`) that removes rows, so we point-delete each by PK
  // instead (see updateLogEntry in db/logEntries.ts for the same pattern).
  const prevQuantIds: string[] = [];
  {
    const s = await db.prepare('SELECT id FROM item_quantifiers WHERE item_id = ?');
    for await (const r of s.all([itemId])) prevQuantIds.push(r.id as string);
    await s.finalize();
  }
  // Which existing quantifiers are referenced by log history? Those can't be
  // hard-deleted (fk_log_quant_values_quant) — they're retired instead.
  const referencedQuantIds = new Set<string>();
  for (const qid of prevQuantIds) {
    const s = await db.prepare('SELECT 1 AS x FROM log_entry_quantifier_values WHERE quantifier_id = ? LIMIT 1');
    const row = await s.get([qid]);
    await s.finalize();
    if (row) referencedQuantIds.add(qid);
  }

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

    // Quantifiers: MERGE by identity rather than replace-all. Deleting a
    // quantifier that a log entry references violates fk_log_quant_values_quant,
    // so we update existing rows in place (id preserved → history stays valid),
    // insert new ones, and for removed ones retire (if referenced) or delete.
    const prevQuantSet = new Set(prevQuantIds);
    const keepIds = new Set<string>();
    for (const q of input.quantifiers) {
      if (q.id && prevQuantSet.has(q.id)) {
        await db.exec('UPDATE item_quantifiers SET name = ?, min_value = ?, max_value = ?, units = ?, retired_at = NULL WHERE id = ?', [
          q.name,
          q.minValue ?? null,
          q.maxValue ?? null,
          q.units ?? null,
          q.id,
        ]);
        keepIds.add(q.id);
      } else {
        const qid = q.id ?? newUuid();
        await db.exec('INSERT INTO item_quantifiers (id, item_id, name, min_value, max_value, units) VALUES (?, ?, ?, ?, ?, ?)', [
          qid,
          itemId,
          q.name,
          q.minValue ?? null,
          q.maxValue ?? null,
          q.units ?? null,
        ]);
        keepIds.add(qid);
      }
    }
    for (const qid of prevQuantIds) {
      if (keepIds.has(qid)) continue;
      if (referencedQuantIds.has(qid)) {
        // Referenced by history — retire (FK-safe) instead of hard delete.
        await db.exec('UPDATE item_quantifiers SET retired_at = ? WHERE id = ?', [new Date().toISOString(), qid]);
      } else {
        await db.exec('DELETE FROM item_quantifiers WHERE id = ?', [qid]);
      }
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

/**
 * Create or update a bundle and its item members (members are replaced).
 * Members are replaced via point-delete (a scanning DELETE that removes rows
 * trips Quereus's "Path is invalid due to mutation of the tree").
 */
export async function upsertBundle(input: {
  id?: string;
  name: string;
  typeName: string;
  members: Array<{ itemId: string; displayOrder?: number }>;
}): Promise<string> {
  const db = await getDatabase();
  const typeId = await getOrCreateType(db, input.typeName);
  const bundleId = input.id ?? newUuid();

  // Snapshot existing member row ids BEFORE the transaction (drain the cursor).
  const prevMemberIds: string[] = [];
  {
    const s = await db.prepare('SELECT id FROM bundle_members WHERE bundle_id = ?');
    for await (const r of s.all([bundleId])) prevMemberIds.push(r.id as string);
    await s.finalize();
  }

  await db.exec('BEGIN');
  try {
    const existsStmt = await db.prepare('SELECT id FROM bundles WHERE id = ?');
    const exists = await existsStmt.get([bundleId]);
    await existsStmt.finalize();
    if (exists) {
      await db.exec('UPDATE bundles SET name = ?, type_id = ? WHERE id = ?', [input.name, typeId, bundleId]);
    } else {
      await db.exec('INSERT INTO bundles (id, type_id, name) VALUES (?, ?, ?)', [bundleId, typeId, input.name]);
    }

    for (const mid of prevMemberIds) {
      await db.exec('DELETE FROM bundle_members WHERE id = ?', [mid]);
    }
    let order = 0;
    for (const m of input.members) {
      // Item members set item_id (member_bundle_id stays null) per the
      // one_member_type CHECK constraint.
      await db.exec('INSERT INTO bundle_members (id, bundle_id, item_id, member_bundle_id, display_order) VALUES (?, ?, ?, ?, ?)', [
        newUuid(),
        bundleId,
        m.itemId,
        null,
        m.displayOrder ?? order,
      ]);
      order++;
    }

    await db.exec('COMMIT');
    return bundleId;
  } catch (e) {
    await db.exec('ROLLBACK');
    throw e;
  }
}

/** Member item ids of a bundle, in display order (for expansion at log-time). */
export async function getBundleItemIds(bundleId: string): Promise<string[]> {
  const db = await getDatabase();
  const stmt = await db.prepare('SELECT item_id FROM bundle_members WHERE bundle_id = ? AND item_id IS NOT NULL ORDER BY display_order');
  const ids: string[] = [];
  for await (const r of stmt.all([bundleId])) ids.push(r.item_id as string);
  await stmt.finalize();
  return ids;
}

export async function getAllCatalogBundles(): Promise<Array<{ id: string; name: string; type: string; itemIds: string[] }>> {
  const db = await getDatabase();

  // Bundles (flat) + all members in one scan, grouped in JS — was N+1 (a members
  // query per bundle). Members ordered by display_order within each bundle.
  const out: Array<{ id: string; name: string; type: string; itemIds: string[] }> = [];
  const byId = new Map<string, { itemIds: string[] }>();
  for await (const b of db.eval(`
    SELECT b.id AS id, b.name AS name, t.name AS type
    FROM bundles b
    LEFT JOIN types t ON t.id = b.type_id
    ORDER BY b.name
  `)) {
    const bundle = { id: b.id as string, name: b.name as string, type: (b.type as string) || 'Activity', itemIds: [] as string[] };
    out.push(bundle);
    byId.set(bundle.id, bundle);
  }
  if (out.length === 0) return out;

  for await (const r of db.eval(`
    SELECT bundle_id AS bundleId, item_id AS itemId
    FROM bundle_members
    WHERE item_id IS NOT NULL
    ORDER BY bundle_id, display_order
  `)) {
    byId.get(r.bundleId as string)?.itemIds.push(r.itemId as string);
  }
  return out;
}


