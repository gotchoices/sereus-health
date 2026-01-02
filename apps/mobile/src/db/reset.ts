import { LevelDB } from 'rn-leveldb';
import { createLogger } from '../util/logger';
import { closeDatabase } from './index';
import { resetInitializationState } from './init';

const logger = createLogger('DB Reset');

const BASE = 'quereus';
const MAIN_TABLES = [
  'types',
  'categories',
  'items',
  'item_quantifiers',
  'bundles',
  'bundle_members',
  'log_entries',
  'log_entry_items',
  'log_entry_quantifier_values',
] as const;

export async function resetDatabaseForDev(): Promise<void> {
  if (!__DEV__) {
    throw new Error('resetDatabaseForDev is dev-only');
  }

  logger.info('Resetting Quereus DB (dev-only)...');

  // Ensure any open handles are closed before destroying stores.
  await closeDatabase();
  resetInitializationState();

  const dbNames: string[] = [formatCatalogDbName(BASE), ...MAIN_TABLES.map((t) => formatDbName(BASE, 'main', t))];

  for (const name of dbNames) {
    try {
      LevelDB.destroyDB(name, true);
      logger.info(`Destroyed store: ${name}`);
    } catch (e) {
      logger.debug(`Destroy store skipped/failed for ${name}:`, e);
    }
  }

  logger.info('Reset complete');
}

function formatCatalogDbName(basePath: string): string {
  return `${safeName(basePath)}__catalog__`;
}

function formatDbName(basePath: string, schemaName: string, tableName: string): string {
  return `${safeName(basePath)}__${safeName(schemaName)}__${safeName(tableName)}`;
}

function safeName(input: string): string {
  return input.trim().toLowerCase().replace(/[^a-z0-9._-]+/g, '_');
}


