/**
 * Sample data for Appeus scenario screenshots and development
 * This file is only used when __DEV__ is true
 * 
 * Provides realistic example data to populate the app for testing and screenshots
 */

import type { Database } from '@quereus/quereus';
import { createLogger } from '../util/logger';

const logger = createLogger('DB Samples');

/**
 * Rich sample data for development/testing
 */
export const SAMPLE_DATA = {
	items: [
		// Eating items
		{ id: 'item-omelette', category_id: 'cat-eating', name: 'Omelette', description: null },
		{ id: 'item-toast', category_id: 'cat-eating', name: 'Toast', description: null },
		{ id: 'item-orange-juice', category_id: 'cat-eating', name: 'Orange Juice', description: null },
		{ id: 'item-bacon', category_id: 'cat-eating', name: 'Bacon', description: null },
		{ id: 'item-lettuce', category_id: 'cat-eating', name: 'Lettuce', description: null },
		{ id: 'item-tomato', category_id: 'cat-eating', name: 'Tomato', description: null },
		{ id: 'item-bread', category_id: 'cat-eating', name: 'Bread', description: null },
		{ id: 'item-mayo', category_id: 'cat-eating', name: 'Mayonnaise', description: null },
		// Exercise items
		{ id: 'item-running', category_id: 'cat-exercise', name: 'Running', description: null },
		{ id: 'item-weights', category_id: 'cat-exercise', name: 'Weights', description: null },
		{ id: 'item-yoga', category_id: 'cat-exercise', name: 'Yoga', description: null },
		// Pain items (with quantifiers)
		{ id: 'item-headache', category_id: 'cat-pain', name: 'Headache', description: null },
		{ id: 'item-stomach-pain', category_id: 'cat-pain', name: 'Stomach Pain', description: null },
	],
	
	item_quantifiers: [
		{ id: 'quant-headache-intensity', item_id: 'item-headache', name: 'Intensity', min_value: 1.0, max_value: 10.0, units: 'scale' },
		{ id: 'quant-headache-duration', item_id: 'item-headache', name: 'Duration', min_value: 0.0, max_value: null, units: 'minutes' },
		{ id: 'quant-stomach-intensity', item_id: 'item-stomach-pain', name: 'Intensity', min_value: 1.0, max_value: 10.0, units: 'scale' },
	],
	
	bundles: [
		{ id: 'bundle-blt', name: 'BLT' },
	],
	
	bundle_members: [
		{ id: 'bm-blt-1', bundle_id: 'bundle-blt', item_id: 'item-bacon', member_bundle_id: null, display_order: 1 },
		{ id: 'bm-blt-2', bundle_id: 'bundle-blt', item_id: 'item-lettuce', member_bundle_id: null, display_order: 2 },
		{ id: 'bm-blt-3', bundle_id: 'bundle-blt', item_id: 'item-tomato', member_bundle_id: null, display_order: 3 },
		{ id: 'bm-blt-4', bundle_id: 'bundle-blt', item_id: 'item-bread', member_bundle_id: null, display_order: 4 },
		{ id: 'bm-blt-5', bundle_id: 'bundle-blt', item_id: 'item-mayo', member_bundle_id: null, display_order: 5 },
	],
	
	log_entries: [
		{ id: 'entry-breakfast', timestamp: '2025-11-26T08:00:00Z', type_id: 'type-activity', comment: 'Good breakfast to start the day' },
		{ id: 'entry-morning-run', timestamp: '2025-11-26T09:30:00Z', type_id: 'type-activity', comment: 'Morning jog in the park' },
		{ id: 'entry-lunch', timestamp: '2025-11-26T12:15:00Z', type_id: 'type-activity', comment: null },
		{ id: 'entry-headache', timestamp: '2025-11-26T14:00:00Z', type_id: 'type-outcome', comment: 'Started after lunch' },
	],
	
	log_entry_items: [
		// Breakfast
		{ entry_id: 'entry-breakfast', item_id: 'item-omelette', source_bundle_id: null },
		{ entry_id: 'entry-breakfast', item_id: 'item-toast', source_bundle_id: null },
		{ entry_id: 'entry-breakfast', item_id: 'item-orange-juice', source_bundle_id: null },
		// Morning run
		{ entry_id: 'entry-morning-run', item_id: 'item-running', source_bundle_id: null },
		// Lunch (BLT bundle)
		{ entry_id: 'entry-lunch', item_id: 'item-bacon', source_bundle_id: 'bundle-blt' },
		{ entry_id: 'entry-lunch', item_id: 'item-lettuce', source_bundle_id: 'bundle-blt' },
		{ entry_id: 'entry-lunch', item_id: 'item-tomato', source_bundle_id: 'bundle-blt' },
		{ entry_id: 'entry-lunch', item_id: 'item-bread', source_bundle_id: 'bundle-blt' },
		{ entry_id: 'entry-lunch', item_id: 'item-mayo', source_bundle_id: 'bundle-blt' },
		// Headache
		{ entry_id: 'entry-headache', item_id: 'item-headache', source_bundle_id: null },
	],
	
	log_entry_quantifier_values: [
		{ entry_id: 'entry-headache', item_id: 'item-headache', quantifier_id: 'quant-headache-intensity', value: 7.0 },
		{ entry_id: 'entry-headache', item_id: 'item-headache', quantifier_id: 'quant-headache-duration', value: 45.0 },
	],
};

/**
 * Apply sample data to the database (development only)
 * Uses a transaction for atomicity
 * 
 * NOTE: Some inserts use direct SQL instead of prepared statements
 * due to a Quereus bug where NULL values are rejected even for nullable columns.
 * See docs/quereus-rn-issues.md #3 for details.
 */
export async function applySampleData(db: Database): Promise<void> {
	try {
		logger.info('Applying sample data for development...');
		// NOTE: Removed explicit BEGIN/COMMIT due to Quereus bug in RN (see docs/quereus-rn-issues.md #4)
		// Using autocommit mode instead
		
		logger.debug('Inserting items...');
		
		// Insert items
		const itemStmt = await db.prepare('INSERT INTO items (id, category_id, name, description) VALUES (?, ?, ?, ?)');
		for (const item of SAMPLE_DATA.items) {
			await itemStmt.run([item.id, item.category_id, item.name, item.description]);
		}
		await itemStmt.finalize();
		logger.debug(`Inserted ${SAMPLE_DATA.items.length} items`);
		
		// Insert item quantifiers
		// Note: Using direct SQL instead of prepared statements due to Quereus NULL handling quirk
		logger.debug('Inserting item quantifiers...');
		for (const quant of SAMPLE_DATA.item_quantifiers) {
			const maxVal = quant.max_value === null ? 'NULL' : quant.max_value;
			await db.exec(`INSERT INTO item_quantifiers (id, item_id, name, min_value, max_value, units) VALUES ('${quant.id}', '${quant.item_id}', '${quant.name}', ${quant.min_value}, ${maxVal}, '${quant.units}')`);
		}
		logger.debug(`Inserted ${SAMPLE_DATA.item_quantifiers.length} quantifiers`);
		
		// Insert bundles
		logger.debug('Inserting bundles...');
		const bundleStmt = await db.prepare('INSERT INTO bundles (id, name) VALUES (?, ?)');
		for (const bundle of SAMPLE_DATA.bundles) {
			await bundleStmt.run([bundle.id, bundle.name]);
		}
		await bundleStmt.finalize();
		logger.debug(`Inserted ${SAMPLE_DATA.bundles.length} bundles`);
		
		// Insert bundle members
		logger.debug('Inserting bundle members...');
		const memberStmt = await db.prepare('INSERT INTO bundle_members (id, bundle_id, item_id, member_bundle_id, display_order) VALUES (?, ?, ?, ?, ?)');
		for (const member of SAMPLE_DATA.bundle_members) {
			await memberStmt.run([member.id, member.bundle_id, member.item_id, member.member_bundle_id, member.display_order]);
		}
		await memberStmt.finalize();
		logger.debug(`Inserted ${SAMPLE_DATA.bundle_members.length} bundle members`);
		
		// Insert log entries
		// Note: Using direct SQL due to Quereus NULL handling bug (see docs/quereus-rn-issues.md #3)
		logger.debug('Inserting log entries...');
		for (const entry of SAMPLE_DATA.log_entries) {
			const comment = entry.comment === null ? 'NULL' : `'${entry.comment.replace(/'/g, "''")}'`;
			await db.exec(`INSERT INTO log_entries (id, timestamp, type_id, comment) VALUES ('${entry.id}', '${entry.timestamp}', '${entry.type_id}', ${comment})`);
		}
		logger.debug(`Inserted ${SAMPLE_DATA.log_entries.length} log entries`);
		
		// Insert log entry items
		// Note: Using direct SQL due to Quereus NULL handling bug (see docs/quereus-rn-issues.md #3)
		for (const lei of SAMPLE_DATA.log_entry_items) {
			const bundleId = lei.source_bundle_id === null ? 'NULL' : `'${lei.source_bundle_id}'`;
			await db.exec(`INSERT INTO log_entry_items (entry_id, item_id, source_bundle_id) VALUES ('${lei.entry_id}', '${lei.item_id}', ${bundleId})`);
		}
		
		// Insert log entry quantifier values
		const qvStmt = await db.prepare('INSERT INTO log_entry_quantifier_values (entry_id, item_id, quantifier_id, value) VALUES (?, ?, ?, ?)');
		for (const qv of SAMPLE_DATA.log_entry_quantifier_values) {
			await qvStmt.run([qv.entry_id, qv.item_id, qv.quantifier_id, qv.value]);
		}
		await qvStmt.finalize();
		
		logger.info(`Sample data applied: ${SAMPLE_DATA.items.length} items, ${SAMPLE_DATA.bundles.length} bundles, ${SAMPLE_DATA.log_entries.length} log entries`);
	} catch (error) {
		logger.error('Failed to apply sample data:', error);
		throw error;
	}
}

