import { USE_QUEREUS } from '../db/config';
import { ensureDatabaseInitialized } from '../db/init';
import { getAllCatalogItems, getAllCatalogBundles, getItemDetail, insertCatalogItem } from '../db/catalog';
import { getAllLogEntries } from '../db/logEntries';
import { getDatabase } from '../db';
import { newUuid } from '../util/id';

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

export interface ImportPreview {
  catalogItemsAdd: number;
  catalogItemsUpdate: number;
  catalogItemsSkip: number;
  bundlesAdd: number;
  bundlesUpdate: number;
  bundlesSkip: number;
  logsAdd: number;
  logsUpdate: number;
  logsSkip: number;
  errors: string[];
  warnings: string[];
}

export interface ImportOptions {
  mode: 'merge' | 'replace';
  dryRun?: boolean;
}

/**
 * Import backup data (YAML format per design/specs/api/import-export.md)
 * 
 * @param backupData Parsed backup data
 * @param options Import options (merge vs replace, dry-run for preview)
 * @returns Preview of what will be imported (add/update/skip counts)
 */
export async function importBackup(
  backupData: BackupData,
  options: ImportOptions = { mode: 'merge' }
): Promise<ImportPreview> {
  if (!USE_QUEREUS) {
    // Mock mode: return empty preview
    return {
      catalogItemsAdd: 0,
      catalogItemsUpdate: 0,
      catalogItemsSkip: 0,
      bundlesAdd: 0,
      bundlesUpdate: 0,
      bundlesSkip: 0,
      logsAdd: 0,
      logsUpdate: 0,
      logsSkip: 0,
      errors: [],
      warnings: ['Import not supported in mock mode'],
    };
  }

  await ensureDatabaseInitialized();
  const db = await getDatabase();

  const preview: ImportPreview = {
    catalogItemsAdd: 0,
    catalogItemsUpdate: 0,
    catalogItemsSkip: 0,
    bundlesAdd: 0,
    bundlesUpdate: 0,
    bundlesSkip: 0,
    logsAdd: 0,
    logsUpdate: 0,
    logsSkip: 0,
    errors: [],
    warnings: [],
  };

  // Validate backup structure
  if (!backupData.version || !backupData.exportedAtUtc) {
    preview.errors.push('Invalid backup file: missing version or exportedAtUtc');
    return preview;
  }

  // If replace mode and not dry-run, clear the database first
  if (options.mode === 'replace' && !options.dryRun) {
    // TODO: Implement clear database logic
    preview.warnings.push('Replace mode: database will be cleared first (not yet implemented)');
  }

  // Import catalog items (idempotent by typeName+categoryName+itemName)
  if (backupData.catalog?.items) {
    const existingItems = await getAllCatalogItems();
    const existingItemKeys = new Set(
      existingItems.map((it) => 
        `${it.type.toLowerCase()}|${it.category.toLowerCase()}|${it.name.toLowerCase()}`
      )
    );

    for (const item of backupData.catalog.items) {
      const key = `${item.typeName.toLowerCase()}|${item.categoryName.toLowerCase()}|${item.name.toLowerCase()}`;
      
      if (existingItemKeys.has(key)) {
        preview.catalogItemsUpdate++;
        // TODO: Check if item details differ and update if needed
      } else {
        preview.catalogItemsAdd++;
        if (!options.dryRun) {
          try {
            await insertCatalogItem({
              typeName: item.typeName,
              categoryName: item.categoryName,
              itemName: item.name,
            });
          } catch (err) {
            preview.errors.push(`Failed to import item ${item.name}: ${String(err)}`);
          }
        }
      }
    }
  }

  // Import bundles (idempotent by typeName+bundleName)
  if (backupData.catalog?.bundles) {
    const existingBundles = await getAllCatalogBundles();
    const existingBundleKeys = new Set(
      existingBundles.map((b) => `${b.type.toLowerCase()}|${b.name.toLowerCase()}`)
    );

    for (const bundle of backupData.catalog.bundles) {
      const key = `${bundle.typeName.toLowerCase()}|${bundle.name.toLowerCase()}`;
      
      if (existingBundleKeys.has(key)) {
        preview.bundlesUpdate++;
        // TODO: Check if bundle members differ and update if needed
      } else {
        preview.bundlesAdd++;
        // TODO: Implement bundle import
        if (!options.dryRun) {
          preview.warnings.push(`Bundle import not yet implemented: ${bundle.name}`);
        }
      }
    }
  }

  // Import logs (idempotent by timestampUtc+typeName+items)
  if (backupData.logs) {
    const existingLogs = await getAllLogEntries();
    const existingLogKeys = new Set(
      existingLogs.map((log) => 
        `${log.timestamp}|${log.typeName}|${log.items.map(it => it.name).sort().join(',')}`
      )
    );

    for (const log of backupData.logs) {
      const key = `${log.timestampUtc}|${log.typeName}|${log.items.map(it => it.itemName).sort().join(',')}`;
      
      if (existingLogKeys.has(key)) {
        preview.logsUpdate++;
        // TODO: Check if quantifier values/comments differ and update if needed
      } else {
        preview.logsAdd++;
        // TODO: Implement log import
        if (!options.dryRun) {
          preview.warnings.push(`Log import not yet implemented`);
        }
      }
    }
  }

  return preview;
}

