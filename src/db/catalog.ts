/**
 * Catalog CRUD Operations
 * 
 * Provides create, read, update, delete operations for catalog items
 * (types, categories, items, bundles).
 */

import type { Database } from '@quereus/quereus';
import { getDatabase } from './index';
import { createLogger } from '../util/logger';

const logger = createLogger('DB Catalog');

/**
 * Input for inserting catalog item using names
 */
export interface InsertCatalogItemInput {
  typeName: string;
  categoryName: string;
  itemName: string;
}

/**
 * Get or create a type by name
 */
async function getOrCreateType(db: Database, typeName: string): Promise<string> {
  const stmt = await db.prepare('SELECT id FROM types WHERE name = ?');
  const row = await stmt.get([typeName]);
  await stmt.finalize();
  
  if (row) {
    return row.id as string;
  }
  
  const id = `type-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 7)}`;
  logger.debug(`Creating type: ${typeName} (${id})`);
  await db.exec('INSERT INTO types (id, name, display_order) VALUES (?, ?, ?)', [id, typeName, 999]);
  return id;
}

/**
 * Get or create a category by name and type
 */
async function getOrCreateCategory(db: Database, categoryName: string, typeId: string): Promise<string> {
  const stmt = await db.prepare('SELECT id FROM categories WHERE name = ? AND type_id = ?');
  const row = await stmt.get([categoryName, typeId]);
  await stmt.finalize();
  
  if (row) {
    return row.id as string;
  }
  
  const id = `cat-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 7)}`;
  logger.debug(`Creating category: ${categoryName} (${id})`);
  await db.exec('INSERT INTO categories (id, name, type_id) VALUES (?, ?, ?)', [id, categoryName, typeId]);
  return id;
}

/**
 * Get or create an item by name and category
 */
async function getOrCreateItem(db: Database, itemName: string, categoryId: string): Promise<{ id: string; created: boolean }> {
  const stmt = await db.prepare('SELECT id FROM items WHERE name = ? AND category_id = ?');
  const row = await stmt.get([itemName, categoryId]);
  await stmt.finalize();
  
  if (row) {
    return { id: row.id as string, created: false };
  }
  
  const id = `item-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 7)}`;
  logger.debug(`Creating item: ${itemName} (${id})`);
  await db.exec('INSERT INTO items (id, name, category_id) VALUES (?, ?, ?)', [id, itemName, categoryId]);
  return { id, created: true };
}

/**
 * Insert a catalog item using names
 * Creates types and categories if they don't exist
 * Returns item ID
 */
export async function insertCatalogItem(input: InsertCatalogItemInput): Promise<string> {
  const db = await getDatabase();
  
  // Get or create type
  const typeId = await getOrCreateType(db, input.typeName);
  
  // Get or create category
  const categoryId = await getOrCreateCategory(db, input.categoryName, typeId);
  
  // Get or create item (idempotent)
  const { id } = await getOrCreateItem(db, input.itemName, categoryId);
  
  return id;
}

/**
 * Get all items from the database
 */
export async function getAllCatalogItems(): Promise<Array<{
  id: string;
  name: string;
  type: string;
  category: string;
}>> {
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
  
  const rows = [];
  for await (const row of stmt.all()) {
    rows.push({
      id: row.id as string,
      name: row.name as string,
      type: row.type as string,
      category: row.category as string,
    });
  }
  await stmt.finalize();
  
  return rows;
}

/**
 * Get all bundles from the database
 */
export async function getAllCatalogBundles(): Promise<Array<{
  id: string;
  name: string;
  type: string;
  itemIds: string[];
}>> {
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
  
  const bundles = [];
  for await (const row of bundleStmt.all()) {
    // Get items for this bundle
    const itemStmt = await db.prepare(`
      SELECT item_id FROM bundle_members WHERE bundle_id = ?
    `);
    const itemIds: string[] = [];
    for await (const itemRow of itemStmt.all([row.id as string])) {
      itemIds.push(itemRow.item_id as string);
    }
    await itemStmt.finalize();
    
    bundles.push({
      id: row.id as string,
      name: row.name as string,
      type: row.type as string || 'Activity',
      itemIds,
    });
  }
  await bundleStmt.finalize();
  
  return bundles;
}

