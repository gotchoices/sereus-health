/**
 * Quereus schema + minimal seeds.
 *
 * NOTE: Phase 1 uses Quereus in-memory backend; persistence is validated later.
 */
import type { Database } from '@quereus/quereus';
import { createLogger } from '../util/logger';

const logger = createLogger('DB Schema');

const SCHEMA_SQL = `
declare schema main using (default_vtab_module = 'memory') {
  table types (
    id text primary key,
    name text unique,
    color text null,
    display_order integer default 0
  );

  table categories (
    id text primary key,
    type_id text,
    name text,
    constraint unique_category_per_type unique (type_id, name),
    constraint fk_categories_type foreign key (type_id) references types(id)
  );

  table items (
    id text primary key,
    category_id text,
    name text,
    description text null,
    constraint unique_item_per_category unique (category_id, name),
    constraint fk_items_category foreign key (category_id) references categories(id)
  );

  table item_quantifiers (
    id text primary key,
    item_id text,
    name text,
    min_value real null,
    max_value real null,
    units text null,
    constraint unique_quantifier_per_item unique (item_id, name),
    constraint fk_quantifiers_item foreign key (item_id) references items(id)
  );

  table bundles (
    id text primary key,
    type_id text,
    name text,
    constraint unique_bundle_per_type unique (type_id, name),
    constraint fk_bundles_type foreign key (type_id) references types(id)
  );

  table bundle_members (
    id text primary key,
    bundle_id text,
    item_id text null,
    member_bundle_id text null,
    display_order integer,
    constraint one_member_type check (
      (item_id is not null and member_bundle_id is null) or
      (item_id is null and member_bundle_id is not null)
    ),
    constraint fk_bundle_members_bundle foreign key (bundle_id) references bundles(id),
    constraint fk_bundle_members_item foreign key (item_id) references items(id),
    constraint fk_bundle_members_nested foreign key (member_bundle_id) references bundles(id)
  );

  table log_entries (
    id text primary key,
    timestamp text,
    type_id text,
    comment text null,
    constraint fk_log_entries_type foreign key (type_id) references types(id)
  );

  table log_entry_items (
    entry_id text,
    item_id text,
    source_bundle_id text null,
    constraint pk_log_entry_items primary key (entry_id, item_id),
    constraint fk_log_entry_items_entry foreign key (entry_id) references log_entries(id),
    constraint fk_log_entry_items_item foreign key (item_id) references items(id),
    constraint fk_log_entry_items_bundle foreign key (source_bundle_id) references bundles(id)
  );

  table log_entry_quantifier_values (
    entry_id text,
    item_id text,
    quantifier_id text,
    value real,
    constraint pk_log_entry_quantifier_values primary key (entry_id, item_id, quantifier_id),
    constraint fk_log_quant_values_entry foreign key (entry_id) references log_entries(id),
    constraint fk_log_quant_values_item foreign key (item_id) references items(id),
    constraint fk_log_quant_values_quant foreign key (quantifier_id) references item_quantifiers(id)
  );

  index idx_categories_type on categories(type_id);
  index idx_items_category on items(category_id);
  index idx_item_quantifiers_item on item_quantifiers(item_id);
  index idx_bundles_type on bundles(type_id);
  index idx_bundle_members_bundle on bundle_members(bundle_id);
  index idx_bundle_members_item on bundle_members(item_id);
  index idx_bundle_members_member_bundle on bundle_members(member_bundle_id);
  index idx_log_entries_timestamp on log_entries(timestamp desc);
  index idx_log_entries_type on log_entries(type_id);
  index idx_log_entry_items_entry on log_entry_items(entry_id);
  index idx_log_entry_items_item on log_entry_items(item_id);
  index idx_log_entry_items_source_bundle on log_entry_items(source_bundle_id);
  index idx_log_entry_quantifier_values_entry on log_entry_quantifier_values(entry_id);
}
`;

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
};

export async function applySchema(db: Database): Promise<void> {
  logger.info('Declaring schema...');
  await db.exec(SCHEMA_SQL);
  logger.info('Applying schema...');
  await db.exec('apply schema main');
  logger.info('Schema applied');
}

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
}


