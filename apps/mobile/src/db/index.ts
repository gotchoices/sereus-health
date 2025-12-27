/**
 * Quereus DB instance (singleton)
 *
 * Phase 1: in-memory only. Persistent Quereus will be validated separately.
 */
import { Database } from '@quereus/quereus';
import { createLogger } from '../util/logger';

const logger = createLogger('DB');

let dbInstance: Database | null = null;
let instanceId = 0;

export async function getDatabase(): Promise<Database> {
  if (dbInstance) return dbInstance;
  instanceId++;
  logger.info(`Creating database instance #${instanceId}`);
  dbInstance = new Database();
  return dbInstance;
}

export async function closeDatabase(): Promise<void> {
  if (!dbInstance) return;
  await dbInstance.close();
  dbInstance = null;
}


