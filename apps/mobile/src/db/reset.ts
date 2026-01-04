import { LevelDB } from 'rn-leveldb';
import { createLogger } from '../util/logger';
import { closeDatabase } from './index';
import { resetInitializationState } from './init';

const logger = createLogger('DB Reset');

// Must match the `databaseName` passed when registering the LevelDB plugin.
const DATABASE_NAME = 'quereus';
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

  const dbNames: string[] = [
    formatCatalogDbName(DATABASE_NAME),
    ...MAIN_TABLES.map((t) => formatDbName(DATABASE_NAME, 'main', t)),
  ];

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
  // Matches @quereus/plugin-react-native-leveldb provider naming:
  // `${databaseName}.__catalog__`
  return `${basePath}.__catalog__`.toLowerCase();
}

function formatDbName(basePath: string, schemaName: string, tableName: string): string {
  // Matches @quereus/plugin-react-native-leveldb provider naming:
  // `${databaseName}.${schemaName}.${tableName}`
  return `${basePath}.${schemaName}.${tableName}`.toLowerCase();
}


