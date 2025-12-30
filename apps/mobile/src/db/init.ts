/**
 * DB initialization singleton.
 *
 * Ensures schema + seeds are applied once before first query.
 */
import { getDatabase } from './index';
import { applyProductionSeeds, applySchema } from './schema';
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

      // Check if schema exists
      let schemaExists = false;
      try {
        const stmt = await db.prepare("SELECT name FROM schema() WHERE type = 'table' AND name = 'types'");
        const row = await stmt.get();
        await stmt.finalize();
        schemaExists = row !== undefined;
      } catch {
        schemaExists = false;
      }

      if (!schemaExists) {
        logger.info('First-time setup: applying schema...');
        await applySchema(db);
      }

      // Seed check
      const countStmt = await db.prepare('SELECT COUNT(*) as count FROM types');
      const countRow = await countStmt.get();
      await countStmt.finalize();
      const typeCount = (countRow?.count as number) || 0;

      if (typeCount === 0) {
        logger.info('Applying production seeds...');
        await applyProductionSeeds(db);
      }

      if (__DEV__ && applySampleData) {
        // Best-effort: sample data may violate uniqueness if re-run
        try {
          await applySampleData(db);
        } catch (e) {
          logger.debug('Sample data not applied (likely already present):', e);
        }
      }

      // Optional verification (keep low-noise; helps spot schema/seed issues during dev)
      if (__DEV__) {
        try {
          const tStmt = await db.prepare('SELECT COUNT(*) as count FROM types');
          const tRow = await tStmt.get();
          await tStmt.finalize();

          const eStmt = await db.prepare('SELECT COUNT(*) as count FROM log_entries');
          const eRow = await eStmt.get();
          await eStmt.finalize();

          logger.debug(`DB verify: types=${String(tRow?.count ?? '?')} log_entries=${String(eRow?.count ?? '?')}`);
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


