/**
 * Health schema application + production seeds.
 *
 * applySchema() is used by the leveldb backend (see db/index.ts).
 * The optimystic backend applies schema via StrandDatabase (see CadreService).
 * applyProductionSeeds() is used by both backends (see db/init.ts).
 */
import type { Database } from '@quereus/quereus';
import SCHEMA_SQL from '../../../../design/specs/domain/schema.qsql';
import { createLogger } from '../util/logger';

const logger = createLogger('DB Schema');

/**
 * Apply the health schema to a leveldb-backed Database.
 * Sets the default virtual table module to 'store' so all tables
 * are backed by the registered LevelDB plugin.
 */
export async function applySchema(db: Database): Promise<void> {
  logger.info('Applying health schema (leveldb)...');
  await db.exec("pragma default_vtab_module = 'store'");
  await db.exec(SCHEMA_SQL);
}

export const PRODUCTION_SEEDS = {
  types: [
    { id: 'type-activity', name: 'Activity', color: '#3B82F6', display_order: 1 },
    { id: 'type-condition', name: 'Condition', color: '#F59E0B', display_order: 2 },
    { id: 'type-outcome', name: 'Outcome', color: '#22C55E', display_order: 3 },
  ],
  categories: [
    { id: 'cat-eating', type_id: 'type-activity', name: 'Eating' },
    { id: 'cat-exercise', type_id: 'type-activity', name: 'Exercise' },
    { id: 'cat-recreation', type_id: 'type-activity', name: 'Recreation' },
    { id: 'cat-stress', type_id: 'type-condition', name: 'Stress' },
    { id: 'cat-weather', type_id: 'type-condition', name: 'Weather' },
    { id: 'cat-environment', type_id: 'type-condition', name: 'Environment' },
    { id: 'cat-pain', type_id: 'type-outcome', name: 'Pain' },
    { id: 'cat-health', type_id: 'type-outcome', name: 'Health' },
    { id: 'cat-wellbeing', type_id: 'type-outcome', name: 'Well-being' },
  ],
  log_entries: [
    {
      id: 'entry-welcome',
      timestamp: '2025-11-26T09:00:00Z',
      type_id: 'type-condition',
      comment:
        'Welcome to Sereus Health! Tap + above to log your first activity, condition, or outcome. Track what you do, how you feel, and find patterns to improve your health.',
    },
  ],
  items: [
    { id: 'item-welcome', category_id: 'cat-health', name: 'Getting Started', description: null as string | null },
  ],
  log_entry_items: [
    { entry_id: 'entry-welcome', item_id: 'item-welcome', source_bundle_id: null as string | null },
  ],
};

export async function applyProductionSeeds(db: Database): Promise<void> {
  logger.info('Applying production seed data...');

  for (const t of PRODUCTION_SEEDS.types) {
    await db.exec('INSERT INTO types (id, name, color, display_order) VALUES (?, ?, ?, ?)', [
      t.id,
      t.name,
      t.color,
      t.display_order,
    ]);
  }

  for (const c of PRODUCTION_SEEDS.categories) {
    await db.exec('INSERT INTO categories (id, type_id, name) VALUES (?, ?, ?)', [c.id, c.type_id, c.name]);
  }

  for (const e of PRODUCTION_SEEDS.log_entries) {
    await db.exec('INSERT INTO log_entries (id, timestamp, type_id, comment) VALUES (?, ?, ?, ?)', [
      e.id,
      e.timestamp,
      e.type_id,
      e.comment,
    ]);
  }

  for (const it of PRODUCTION_SEEDS.items) {
    await db.exec('INSERT INTO items (id, category_id, name, description) VALUES (?, ?, ?, ?)', [
      it.id,
      it.category_id,
      it.name,
      it.description,
    ]);
  }

  for (const lei of PRODUCTION_SEEDS.log_entry_items) {
    await db.exec('INSERT INTO log_entry_items (entry_id, item_id, source_bundle_id) VALUES (?, ?, ?)', [
      lei.entry_id,
      lei.item_id,
      lei.source_bundle_id,
    ]);
  }
}
