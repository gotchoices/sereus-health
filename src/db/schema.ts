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

/**
 * Declarative schema SQL for Diario
 * Uses Quereus declarative schema syntax (order-independent)
 */
const SCHEMA_SQL = `
declare schema main version '1.0.0' {
  -- Top-level types (Activity, Condition, Outcome, custom)
  table types (
    id text primary key,
    name text not null unique
  );

  -- Categories organized under types (flat, no hierarchy)
  table categories (
    id text primary key,
    type_id text not null references types(id) on delete restrict,
    name text not null,
    constraint unique_category_per_type unique (type_id, name)
  );

  -- Individual loggable items
  table items (
    id text primary key,
    category_id text not null references categories(id) on delete restrict,
    name text not null,
    description text null,
    constraint unique_item_per_category unique (category_id, name)
  );

  -- Quantifier definitions attached to items
  table item_quantifiers (
    id text primary key,
    item_id text not null references items(id) on delete cascade,
    name text not null,
    min_value real null,
    max_value real null,
    units text null,
    constraint unique_quantifier_per_item unique (item_id, name)
  );

  -- Bundles (named collections of items/bundles)
  table bundles (
    id text primary key,
    name text not null unique
  );

  -- Bundle membership (items and nested bundles)
  table bundle_members (
    bundle_id text not null references bundles(id) on delete cascade,
    item_id text null references items(id) on delete cascade,
    member_bundle_id text null references bundles(id) on delete cascade,
    display_order integer not null,
    constraint pk_bundle_members primary key (bundle_id, item_id, member_bundle_id),
    constraint one_member_type check (
      (item_id is not null and member_bundle_id is null) or
      (item_id is null and member_bundle_id is not null)
    )
  );

  -- Log entries (timestamped records)
  table log_entries (
    id text primary key,
    timestamp text not null,
    type_id text not null references types(id) on delete restrict,
    comment text null
  );

  -- Items in log entries (bundles expanded at log time)
  table log_entry_items (
    entry_id text not null references log_entries(id) on delete cascade,
    item_id text not null references items(id) on delete restrict,
    source_bundle_id text null references bundles(id) on delete set null,
    constraint pk_log_entry_items primary key (entry_id, item_id)
  );

  -- Recorded quantifier values
  table log_entry_quantifier_values (
    entry_id text not null references log_entries(id) on delete cascade,
    item_id text not null references items(id) on delete restrict,
    quantifier_id text not null references item_quantifiers(id) on delete restrict,
    value real not null,
    constraint pk_log_entry_quantifier_values primary key (entry_id, item_id, quantifier_id)
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
  seed types (id, name) values
    ('type-activity', 'Activity'),
    ('type-condition', 'Condition'),
    ('type-outcome', 'Outcome');

  -- Seed data: Initial categories
  seed categories (id, type_id, name) values
    -- Activity categories
    ('cat-eating', 'type-activity', 'Eating'),
    ('cat-exercise', 'type-activity', 'Exercise'),
    ('cat-recreation', 'type-activity', 'Recreation'),
    -- Condition categories
    ('cat-stress', 'type-condition', 'Stress'),
    ('cat-weather', 'type-condition', 'Weather'),
    ('cat-environment', 'type-condition', 'Environment'),
    -- Outcome categories
    ('cat-pain', 'type-outcome', 'Pain'),
    ('cat-health', 'type-outcome', 'Health'),
    ('cat-wellbeing', 'type-outcome', 'Well-being');

  -- Seed data: Sample items
  seed items (id, category_id, name, description) values
    -- Eating items
    ('item-omelette', 'cat-eating', 'Omelette', null),
    ('item-toast', 'cat-eating', 'Toast', null),
    ('item-orange-juice', 'cat-eating', 'Orange Juice', null),
    ('item-bacon', 'cat-eating', 'Bacon', null),
    ('item-lettuce', 'cat-eating', 'Lettuce', null),
    ('item-tomato', 'cat-eating', 'Tomato', null),
    ('item-bread', 'cat-eating', 'Bread', null),
    ('item-mayo', 'cat-eating', 'Mayonnaise', null),
    -- Exercise items
    ('item-running', 'cat-exercise', 'Running', null),
    ('item-weights', 'cat-exercise', 'Weights', null),
    ('item-yoga', 'cat-exercise', 'Yoga', null),
    -- Pain items (with quantifiers)
    ('item-headache', 'cat-pain', 'Headache', null),
    ('item-stomach-pain', 'cat-pain', 'Stomach Pain', null);

  -- Seed data: Sample quantifiers
  seed item_quantifiers (id, item_id, name, min_value, max_value, units) values
    ('quant-headache-intensity', 'item-headache', 'Intensity', 1.0, 10.0, 'scale'),
    ('quant-headache-duration', 'item-headache', 'Duration', 0.0, null, 'minutes'),
    ('quant-stomach-intensity', 'item-stomach-pain', 'Intensity', 1.0, 10.0, 'scale');

  -- Seed data: Sample bundle (BLT)
  seed bundles (id, name) values
    ('bundle-blt', 'BLT');

  seed bundle_members (bundle_id, item_id, member_bundle_id, display_order) values
    ('bundle-blt', 'item-bacon', null, 1),
    ('bundle-blt', 'item-lettuce', null, 2),
    ('bundle-blt', 'item-tomato', null, 3),
    ('bundle-blt', 'item-bread', null, 4),
    ('bundle-blt', 'item-mayo', null, 5);

  -- Seed data: Welcome note entry (Story 01:9)
  seed log_entries (id, timestamp, type_id, comment) values
    ('entry-welcome', '2025-11-26T09:00:00Z', 'type-condition', 'Welcome to Diario! Tap + above to log your first activity, condition, or outcome. Track what you do, how you feel, and find patterns to improve your health.');
}
`;

/**
 * Apply the Diario schema to the database
 * @param db - Quereus database instance
 * @param withSeed - If true, applies seed data (clears existing data)
 */
export async function applySchema(db: Database, withSeed: boolean = false): Promise<void> {
	// Declare the schema
	await db.exec(SCHEMA_SQL);
	
	// Apply the schema (with or without seed)
	if (withSeed) {
		await db.exec('apply schema main with seed');
	} else {
		await db.exec('apply schema main');
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

