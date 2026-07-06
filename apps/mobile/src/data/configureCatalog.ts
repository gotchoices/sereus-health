import { getVariant } from '../mock';
import { USE_QUEREUS } from '../db/config';
import { ensureDatabaseInitialized } from '../db/init';
import {
  getAllCatalogBundles,
  getAllCatalogItems,
  getTypes,
  getCategoriesWithCounts,
  createCategory as dbCreateCategory,
  renameCategory as dbRenameCategory,
  setCategoryRetired as dbSetCategoryRetired,
  deleteCategory as dbDeleteCategory,
  type CategoryRow,
} from '../db/catalog';

export type CatalogType = 'Activity' | 'Condition' | 'Outcome' | string;

export interface CatalogItem {
  id: string;
  name: string;
  type: CatalogType;
  category: string;
  hasQuantifiers: boolean;
}

export interface CatalogBundle {
  id: string;
  name: string;
  type: CatalogType;
  itemCount: number;
  itemIds: string[];
}

export type { CategoryRow } from '../db/catalog';

type MockItem = { id: string; name: string; type: string; category: string };
type MockBundle = { id: string; name: string; type: string; itemIds: string[] };
type MockData = { items: MockItem[]; bundles: MockBundle[] };

function loadMock(variant: string): MockData {
  // Require avoids TS json-module config differences.
  switch (variant) {
    case 'empty':
      return require('../../mock/data/configure-catalog.empty.json') as MockData;
    case 'error':
      return require('../../mock/data/configure-catalog.error.json') as MockData;
    case 'happy':
    default:
      return require('../../mock/data/configure-catalog.happy.json') as MockData;
  }
}

export async function getConfigureCatalog(): Promise<{ types: CatalogType[]; items: CatalogItem[]; bundles: CatalogBundle[] }> {
  if (!USE_QUEREUS) {
    const variant = getVariant();
    if (variant === 'error') {
      throw new Error('mock:error');
    }

    const raw = loadMock(variant);
    const items: CatalogItem[] = (raw.items ?? []).map((it) => ({
      id: it.id,
      name: it.name,
      type: it.type,
      category: it.category,
      hasQuantifiers: false,
    }));

    const bundles: CatalogBundle[] = (raw.bundles ?? []).map((b) => ({
      id: b.id,
      name: b.name,
      type: b.type,
      itemIds: b.itemIds ?? [],
      itemCount: (b.itemIds ?? []).length,
    }));

    // Mock fixtures have no types table — derive from items/bundles.
    const typeSet = new Set<CatalogType>();
    items.forEach((it) => typeSet.add(it.type));
    bundles.forEach((b) => typeSet.add(b.type));

    return { types: Array.from(typeSet), items, bundles };
  }

  await ensureDatabaseInitialized();
  const dbTypes = await getTypes();
  const dbItems = await getAllCatalogItems();
  const dbBundles = await getAllCatalogBundles();

  return {
    types: dbTypes,
    items: dbItems.map((it) => ({
      id: it.id,
      name: it.name,
      type: it.type,
      category: it.category,
      hasQuantifiers: false, // TODO: query item_quantifiers
    })),
    bundles: dbBundles.map((b) => ({
      id: b.id,
      name: b.name,
      type: b.type,
      itemIds: b.itemIds,
      itemCount: b.itemIds.length,
    })),
  };
}

// ── Category management ──────────────────────────────────────────────────────

/** All categories for a Type (including empty/retired), with item counts. */
export async function getCategories(typeName: string): Promise<CategoryRow[]> {
  if (!USE_QUEREUS) {
    // Derive from mock items (no empty/retired concept in fixtures).
    const raw = loadMock(getVariant());
    const counts = new Map<string, number>();
    for (const it of raw.items ?? []) {
      if (it.type !== typeName) continue;
      counts.set(it.category, (counts.get(it.category) ?? 0) + 1);
    }
    return Array.from(counts.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([name, itemCount]) => ({ id: `mock-cat-${typeName}-${name}`, name, itemCount, retired: false }));
  }
  await ensureDatabaseInitialized();
  return getCategoriesWithCounts(typeName);
}

export async function createCategory(typeName: string, name: string): Promise<void> {
  if (!USE_QUEREUS) return;
  await ensureDatabaseInitialized();
  await dbCreateCategory(typeName, name);
}

export async function renameCategory(categoryId: string, newName: string): Promise<void> {
  if (!USE_QUEREUS) return;
  await ensureDatabaseInitialized();
  await dbRenameCategory(categoryId, newName);
}

export async function setCategoryRetired(categoryId: string, retired: boolean): Promise<void> {
  if (!USE_QUEREUS) return;
  await ensureDatabaseInitialized();
  await dbSetCategoryRetired(categoryId, retired);
}

export async function deleteCategory(categoryId: string): Promise<void> {
  if (!USE_QUEREUS) return;
  await ensureDatabaseInitialized();
  await dbDeleteCategory(categoryId);
}


