import { getDatabase } from './index';

// Child → parent order so foreign keys stay satisfied at every step.
// (Plain full-table DELETEs are safe on Quereus ≥4.3.1 — the scanning-DELETE
// tree-mutation bug that once affected these is fixed.)
const CLEAR_ORDER = [
  'log_entry_quantifier_values',
  'log_entry_items',
  'log_entries',
  'bundle_members',
  'bundles',
  'item_quantifiers',
  'items',
  'categories',
  'types',
] as const;

/**
 * Clear all application data (taxonomy + bundles + logs) from the live database,
 * leaving the schema and the optimystic strand/session intact — unlike the
 * dev-only `resetDatabaseForDev`, which destroys the LevelDB stores and requires
 * a relaunch. Used by backup **Replace** mode (clear, then import) so the restore
 * can run in the same session.
 */
export async function clearAllData(): Promise<void> {
  const db = await getDatabase();
  await db.exec('BEGIN');
  try {
    for (const table of CLEAR_ORDER) {
      await db.exec(`DELETE FROM ${table}`);
    }
    await db.exec('COMMIT');
  } catch (e) {
    await db.exec('ROLLBACK');
    throw e;
  }
}
