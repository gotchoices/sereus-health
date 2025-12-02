/**
 * Diario Database Schema
 * 
 * Declarative schema for Quereus database matching design/specs/api/schema.md
 * 
 * Schema includes:
 * - Types (Activity, Condition, Outcome)
 * - Categories (flat, organized under types)
 * - Items (individual loggable entities)
 * - Item Quantifiers (measurement definitions)
 * - Bundles (collections of items/bundles)
 * - Log Entries (timestamped records)
 * - Log Entry Items (expanded bundles)
 * - Log Entry Quantifier Values (recorded measurements)
 */

import type { Database } from '@quereus/quereus';
import { createLogger } from '../util/logger';

const logger = createLogger('DB Schema');

/**
 * Declarative schema SQL for Diario
 * Uses Quereus declarative schema syntax (order-independent)
 * 
 * SEED DATA STRATEGY:
 * - Currently included in schema for development convenience
 * - `apply schema main with seed` clears and repopulates all tables
 * - For production with persistence:
 *   1. Run schema once on first launch (check schema hash or version table)
 *   2. Skip seed data or use migrations for updates
 *   3. Consider storing schema hash in AsyncStorage to detect first run
 */
const SCHEMA_SQL = `
declare schema main {
  -- Top-level types (Activity, Condition, Outcome, custom)
  table types (
    id text primary key,
    name text unique
  );

  -- Categories organized under types (flat, no hierarchy)
  table categories (
    id text primary key,
    type_id text,
    name text,
    constraint unique_category_per_type unique (type_id, name),
    constraint fk_categories_type foreign key (type_id) references types(id)
  );

  -- Individual loggable items
  table items (
    id text primary key,
    category_id text,
    name text,
    description text null,
    constraint unique_item_per_category unique (category_id, name),
    constraint fk_items_category foreign key (category_id) references categories(id)
  );

  -- Quantifier definitions attached to items
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

  -- Bundles (named collections of items/bundles)
  table bundles (
    id text primary key,
    name text unique
  );

  -- Bundle membership (items and nested bundles)
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

  -- Log entries (timestamped records)
  table log_entries (
    id text primary key,
    timestamp text,
    type_id text,
    comment text null,
    constraint fk_log_entries_type foreign key (type_id) references types(id)
  );

  -- Items in log entries (bundles expanded at log time)
  table log_entry_items (
    entry_id text,
    item_id text,
    source_bundle_id text null,
    constraint pk_log_entry_items primary key (entry_id, item_id),
    constraint fk_log_entry_items_entry foreign key (entry_id) references log_entries(id),
    constraint fk_log_entry_items_item foreign key (item_id) references items(id),
    constraint fk_log_entry_items_bundle foreign key (source_bundle_id) references bundles(id)
  );

  -- Recorded quantifier values
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

  -- Indexes for performance
  index idx_categories_type on categories(type_id);
  index idx_items_category on items(category_id);
  index idx_item_quantifiers_item on item_quantifiers(item_id);
  index idx_bundle_members_bundle on bundle_members(bundle_id);
  index idx_bundle_members_item on bundle_members(item_id);
  index idx_bundle_members_member_bundle on bundle_members(member_bundle_id);
  index idx_log_entries_timestamp on log_entries(timestamp desc);
  index idx_log_entries_type on log_entries(type_id);
  index idx_log_entry_items_entry on log_entry_items(entry_id);
  index idx_log_entry_items_item on log_entry_items(item_id);
  index idx_log_entry_items_source_bundle on log_entry_items(source_bundle_id);
  index idx_log_entry_quantifier_values_entry on log_entry_quantifier_values(entry_id);

  -- Seed data: Initial types
  seed types (
    ('type-activity', 'Activity'),
    ('type-condition', 'Condition'),
    ('type-outcome', 'Outcome')
  )

  -- Seed data: Initial categories
  seed categories (
    ('cat-eating', 'type-activity', 'Eating'),
    ('cat-exercise', 'type-activity', 'Exercise'),
    ('cat-recreation', 'type-activity', 'Recreation'),
    ('cat-stress', 'type-condition', 'Stress'),
    ('cat-weather', 'type-condition', 'Weather'),
    ('cat-environment', 'type-condition', 'Environment'),
    ('cat-pain', 'type-outcome', 'Pain'),
    ('cat-health', 'type-outcome', 'Health'),
    ('cat-wellbeing', 'type-outcome', 'Well-being')
  )

  -- Seed data: Sample items
  seed items (
    ('item-omelette', 'cat-eating', 'Omelette', null),
    ('item-toast', 'cat-eating', 'Toast', null),
    ('item-orange-juice', 'cat-eating', 'Orange Juice', null),
    ('item-bacon', 'cat-eating', 'Bacon', null),
    ('item-lettuce', 'cat-eating', 'Lettuce', null),
    ('item-tomato', 'cat-eating', 'Tomato', null),
    ('item-bread', 'cat-eating', 'Bread', null),
    ('item-mayo', 'cat-eating', 'Mayonnaise', null),
    ('item-running', 'cat-exercise', 'Running', null),
    ('item-weights', 'cat-exercise', 'Weights', null),
    ('item-yoga', 'cat-exercise', 'Yoga', null),
    ('item-headache', 'cat-pain', 'Headache', null),
    ('item-stomach-pain', 'cat-pain', 'Stomach Pain', null)
  )

  -- Seed data: Sample quantifiers
  seed item_quantifiers (
    ('quant-headache-intensity', 'item-headache', 'Intensity', 1.0, 10.0, 'scale'),
    ('quant-headache-duration', 'item-headache', 'Duration', 0.0, null, 'minutes'),
    ('quant-stomach-intensity', 'item-stomach-pain', 'Intensity', 1.0, 10.0, 'scale')
  )

  -- Seed data: Sample bundle (BLT)
  seed bundles (
    ('bundle-blt', 'BLT')
  )

  seed bundle_members (
    ('bm-blt-1', 'bundle-blt', 'item-bacon', null, 1),
    ('bm-blt-2', 'bundle-blt', 'item-lettuce', null, 2),
    ('bm-blt-3', 'bundle-blt', 'item-tomato', null, 3),
    ('bm-blt-4', 'bundle-blt', 'item-bread', null, 4),
    ('bm-blt-5', 'bundle-blt', 'item-mayo', null, 5)
  )

  -- Seed data: Welcome note entry (Story 01:9)
  seed log_entries (id, timestamp, type_id, comment) values
    ('entry-welcome', '2025-11-26T09:00:00Z', 'type-condition', 'Welcome to Diario! Tap + above to log your first activity, condition, or outcome. Track what you do, how you feel, and find patterns to improve your health.')
}
`;

/**
 * Apply the Diario schema to the database
 * @param db - Quereus database instance
 * @param withSeed - If true, applies seed data (clears existing data)
 */
export async function applySchema(db: Database, withSeed: boolean = false): Promise<void> {
	try {
		logger.debug('Declaring schema...');
		// Declare the schema
		await db.exec(SCHEMA_SQL);
		logger.debug('Schema declared successfully');
		
		// Apply the schema (with or without seed)
		if (withSeed) {
			logger.info('Applying schema with seed data...');
			await db.exec('apply schema main with seed');
			logger.info('Schema applied with seed successfully');
		} else {
			logger.info('Applying schema...');
			await db.exec('apply schema main');
			logger.info('Schema applied successfully');
		}
	} catch (error) {
		logger.error('Failed to apply schema:', error);
		throw error;
	}
}

/**
 * Get the schema diff (migration DDL) without applying it
 * Useful for debugging or preview
 */
export async function getDiffSchema(db: Database): Promise<string[]> {
	await db.exec(SCHEMA_SQL);
	
	const ddlStatements: string[] = [];
	for await (const row of db.eval('diff schema main')) {
		ddlStatements.push(row.ddl as string);
	}
	
	return ddlStatements;
}

/**
 * Get schema version and hash
 */
export async function getSchemaInfo(db: Database): Promise<Record<string, any>> {
	const result = await db.prepare('explain schema main').get();
	return result || {};
}

