/**
 * DB initialization singleton.
 *
 * Schema is applied by getDatabase() (either via StrandDatabase for optimystic
 * or via applySchema() for leveldb).  This module ensures seeds are applied
 * once before first query.
 */
import { getDatabase } from './index';
import { applyProductionSeeds } from './schema';
import { createLogger } from '../util/logger';

const logger = createLogger('DB Init');

let initPromise: Promise<void> | null = null;
let isInitialized = false;

// dev-only sample data (kept out of production bundle when possible)
let applySampleData: ((db: any) => Promise<void>) | null = null;
if (__DEV__) {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  applySampleData = require('./schema.samples').applySampleData;
}

export async function ensureDatabaseInitialized(): Promise<void> {
  if (isInitialized) return;
  if (initPromise) return initPromise;

  initPromise = (async () => {
    try {
      logger.info('Initializing DB...');
      const db = await getDatabase();

      // Schema is already applied by StrandDatabase.
      // Check if seeds are needed (empty types table = first run).
      let typeCount = 0;
      try {
        for await (const row of db.eval('SELECT COUNT(*) as count FROM types')) {
          typeCount = (row.count as number) || 0;
        }
      } catch {
        // Table might not be queryable yet — treat as empty
        typeCount = 0;
      }

      logger.debug(`Seed guard: types.count=${String(typeCount)}`);

      const didSeed = typeCount === 0;
      if (typeCount === 0) {
        logger.info('Applying production seeds...');
        await applyProductionSeeds(db);
      }

      // Dev-only sample data
      if (__DEV__ && applySampleData && didSeed) {
        logger.info('Applying sample data (dev, first-run only)...');
        await applySampleData(db);
      }

      // Dev verification
      if (__DEV__) {
        try {
          let tCount = '?', eCount = '?';
          for await (const row of db.eval('SELECT COUNT(*) as count FROM types')) {
            tCount = String(row.count ?? '?');
          }
          for await (const row of db.eval('SELECT COUNT(*) as count FROM log_entries')) {
            eCount = String(row.count ?? '?');
          }
          logger.debug(`DB verify: types=${tCount} log_entries=${eCount}`);
        } catch (e) {
          logger.debug('DB verify failed:', e);
        }
      }

      isInitialized = true;
      logger.info('DB ready');
    } catch (e) {
      logger.error('DB init failed:', e);
      throw e;
    }
  })().catch((e) => {
    initPromise = null;
    throw e;
  });

  await initPromise;
}

export function resetInitializationState(): void {
  initPromise = null;
  isInitialized = false;
}
