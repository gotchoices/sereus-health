import AsyncStorage from '@react-native-async-storage/async-storage';
import { createLogger } from '../util/logger';
import { USE_OPTIMYSTIC } from './config';
import { closeDatabase } from './index';
import { resetInitializationState } from './init';
import { OPTIMYSTIC_DB_PREFIX } from '../services/CadreService';

const logger = createLogger('DB Reset');

/**
 * Dev-only: reset the database.
 *
 * Optimystic mode: stops CadreService (which closes its LevelDB handles),
 *                  clears persisted identifiers, then destroys the
 *                  per-strand `optimystic-<strandId>` LevelDB directories
 *                  (including `optimystic-control` for the node identity
 *                  + control-network state).
 * Quereus-LevelDB mode: closes DB, destroys per-table LevelDB store files.
 *
 * On next launch the app re-bootstraps with empty data and a fresh
 * libp2p peer ID.
 */
export async function resetDatabaseForDev(): Promise<void> {
  if (!__DEV__) {
    throw new Error('resetDatabaseForDev is dev-only');
  }

  logger.info('Resetting database (dev-only)...');

  await closeDatabase();
  resetInitializationState();

  if (USE_OPTIMYSTIC) {
    // Read identifiers before clearing so we know which LevelDB directories
    // to nuke.
    const strandId = await AsyncStorage.getItem('@sereus/healthStrandId');
    await AsyncStorage.multiRemove(['@sereus/partyId', '@sereus/healthStrandId']);

    // Destroy the optimystic LevelDB directories.  `control` always exists
    // (node identity + control repo); the strand directory only exists
    // once the strand has been added.
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { LevelDB } = require('rn-leveldb');
    const dbNames = [`${OPTIMYSTIC_DB_PREFIX}control`];
    if (strandId) dbNames.push(`${OPTIMYSTIC_DB_PREFIX}${strandId}`);

    for (const name of dbNames) {
      try {
        LevelDB.destroyDB(name, true);
        logger.info(`Destroyed optimystic store: ${name}`);
      } catch (e) {
        logger.debug(`Destroy optimystic store skipped/failed for ${name}:`, e);
      }
    }
  } else {
    // Quereus-via-LevelDB: destroy every per-table store file.
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { LevelDB } = require('rn-leveldb');
    const DATABASE_NAME = 'quereus';
    const MAIN_TABLES = [
      'types', 'categories', 'items', 'item_quantifiers',
      'bundles', 'bundle_members',
      'log_entries', 'log_entry_items', 'log_entry_quantifier_values',
    ];

    const dbNames = [
      `${DATABASE_NAME}.__catalog__`.toLowerCase(),
      ...MAIN_TABLES.map(t => `${DATABASE_NAME}.main.${t}`.toLowerCase()),
    ];

    for (const name of dbNames) {
      try {
        LevelDB.destroyDB(name, true);
        logger.info(`Destroyed store: ${name}`);
      } catch (e) {
        logger.debug(`Destroy store skipped/failed for ${name}:`, e);
      }
    }
  }

  logger.info('Reset complete — restart the app to re-bootstrap.');
}
