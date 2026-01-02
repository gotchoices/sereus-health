/**
 * Quereus DB instance (singleton)
 *
 * Phase 2+: persistent store-backed Quereus via `@quereus/plugin-store` + `@quereus/store-rn`.
 */
import { Database } from '@quereus/quereus';
import { StoreModule } from '@quereus/plugin-store/common';
import { createRNProvider } from '@quereus/store-rn';
import { createLogger } from '../util/logger';

const logger = createLogger('DB');

let dbInstance: Database | null = null;
let instanceId = 0;

export async function getDatabase(): Promise<Database> {
  if (dbInstance) return dbInstance;
  instanceId++;
  logger.debug(`Creating database instance #${instanceId}`);
  const db = new Database();

  const provider = createRNProvider({ basePath: 'quereus' });
  const module = new StoreModule(provider);
  db.registerVtabModule('store', module);

  dbInstance = db;
  return dbInstance;
}

export async function closeDatabase(): Promise<void> {
  if (!dbInstance) return;
  await dbInstance.close();
  dbInstance = null;
}


