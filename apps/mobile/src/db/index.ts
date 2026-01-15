/**
 * Quereus DB instance (singleton)
 *
 * Persistent store-backed Quereus via `@quereus/plugin-react-native-leveldb`.
 */
import { Database, enableLogging, registerPlugin } from '@quereus/quereus';
import { plugin as leveldbPlugin } from '@quereus/plugin-react-native-leveldb';
import { LevelDB, LevelDBWriteBatch } from 'rn-leveldb';
import { createLogger } from '../util/logger';

const logger = createLogger('DB');

let dbInstance: Database | null = null;
let dbInitPromise: Promise<Database> | null = null;
let instanceId = 0;

export async function getDatabase(): Promise<Database> {
  if (dbInstance) return dbInstance;
  if (dbInitPromise) return dbInitPromise;
  instanceId++;
  logger.debug(`Creating database instance #${instanceId}`);

  dbInitPromise = (async () => {
    const db = new Database();
    if (__DEV__) {
      // Quereus built-in debug logging (uses `debug` namespaces).
//      enableLogging('quereus:*', console.log.bind(console));
    }

    await registerPlugin(db, leveldbPlugin, {
      databaseName: 'quereus',
      moduleName: 'store',
      openFn: ((name: string, createIfMissing: boolean, errorIfExists: boolean) =>
        new LevelDB(name, createIfMissing, errorIfExists)) as unknown as any,
      WriteBatch: LevelDBWriteBatch as unknown as any,
    });

    dbInstance = db;
    return db;
  })();

  try {
    return await dbInitPromise;
  } finally {
    // Keep dbInstance, but clear the init promise so future calls use the instance.
    dbInitPromise = null;
  }
}

export async function closeDatabase(): Promise<void> {
  if (!dbInstance) return;
  await dbInstance.close();
  dbInstance = null;
  dbInitPromise = null;
}


