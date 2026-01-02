import { USE_QUEREUS } from '../db/config';
import { ensureDatabaseInitialized } from '../db/init';
import { getAllCatalogItems, getAllCatalogBundles, getItemDetail } from '../db/catalog';
import { getAllLogEntries } from '../db/logEntries';

export interface BackupData {
  version: number;
  exportedAtUtc: string;
  catalog: {
    types: Array<{ name: string }>;
    categories: Array<{ typeName: string; name: string }>;
    items: Array<{
      typeName: string;
      categoryName: string;
      name: string;
      description?: string;
      quantifiers?: Array<{
        name: string;
        minValue?: number;
        maxValue?: number;
        units?: string;
      }>;
    }>;
    bundles: Array<{
      typeName: string;
      name: string;
      itemNames: string[];
    }>;
  };
  logs: Array<{
    timestampUtc: string;
    typeName: string;
    items: Array<{
      categoryName: string;
      itemName: string;
      quantifiers?: Array<{
        name: string;
        value: number;
        units?: string;
      }>;
    }>;
    comment?: string;
  }>;
  settings: Record<string, any>;
}

/**
 * Export all app data for backup (YAML format per design/specs/api/import-export.md)
 */
export async function exportBackup(): Promise<BackupData> {
  if (!USE_QUEREUS) {
    // Mock mode: return empty backup
    return {
      version: 1,
      exportedAtUtc: new Date().toISOString(),
      catalog: {
        types: [],
        categories: [],
        items: [],
        bundles: [],
      },
      logs: [],
      settings: {},
    };
  }

  await ensureDatabaseInitialized();

  // Get all catalog items with full details (including quantifiers)
  const itemsList = await getAllCatalogItems();
  const itemsWithDetails = await Promise.all(
    itemsList.map(async (item) => {
      const detail = await getItemDetail(item.id);
      return detail ?? { ...item, description: null, quantifiers: [] };
    })
  );

  // Get all bundles
  const bundlesList = await getAllCatalogBundles();

  // Map item IDs to names for bundles
  const itemIdToName = new Map(itemsList.map((it) => [it.id, it.name]));

  // Get all log entries
  const logsList = await getAllLogEntries();

  // Extract unique types and categories
  const typesSet = new Set<string>();
  const categoriesMap = new Map<string, Set<string>>(); // typeName -> Set<categoryName>

  for (const item of itemsWithDetails) {
    typesSet.add(item.type);
    if (!categoriesMap.has(item.type)) {
      categoriesMap.set(item.type, new Set());
    }
    categoriesMap.get(item.type)!.add(item.category);
  }

  const types = Array.from(typesSet).sort().map((name) => ({ name }));
  const categories = Array.from(categoriesMap.entries())
    .flatMap(([typeName, cats]) =>
      Array.from(cats).sort().map((name) => ({ typeName, name }))
    );

  const items = itemsWithDetails.map((item) => ({
    typeName: item.type,
    categoryName: item.category,
    name: item.name,
    description: item.description ?? undefined,
    quantifiers: item.quantifiers.length > 0
      ? item.quantifiers.map((q) => ({
          name: q.name,
          minValue: q.minValue ?? undefined,
          maxValue: q.maxValue ?? undefined,
          units: q.units ?? undefined,
        }))
      : undefined,
  }));

  const bundles = bundlesList.map((bundle) => ({
    typeName: bundle.type,
    name: bundle.name,
    itemNames: bundle.itemIds.map((id) => itemIdToName.get(id) ?? id),
  }));

  const logs = logsList.map((entry) => ({
    timestampUtc: entry.timestamp,
    typeName: entry.typeName,
    items: entry.items.map((item) => ({
      categoryName: item.categoryName,
      itemName: item.name,
      quantifiers: item.quantifiers && item.quantifiers.length > 0
        ? item.quantifiers.map((q) => ({
            name: q.name,
            value: q.value,
            units: q.units ?? undefined,
          }))
        : undefined,
    })),
    comment: entry.comment ?? undefined,
  }));

  return {
    version: 1,
    exportedAtUtc: new Date().toISOString(),
    catalog: {
      types,
      categories,
      items,
      bundles,
    },
    logs,
    settings: {}, // TODO: Add theme preference when settings are persisted
  };
}

