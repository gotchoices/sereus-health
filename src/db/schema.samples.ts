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
		// === ACTIVITY ITEMS ===
		// Eating (cat-eating) - what you consume
		{ id: 'item-omelette', category_id: 'cat-eating', name: 'Omelette', description: null },
		{ id: 'item-toast', category_id: 'cat-eating', name: 'Toast', description: null },
		{ id: 'item-orange-juice', category_id: 'cat-eating', name: 'Orange Juice', description: null },
		{ id: 'item-bacon', category_id: 'cat-eating', name: 'Bacon', description: null },
		{ id: 'item-lettuce', category_id: 'cat-eating', name: 'Lettuce', description: null },
		{ id: 'item-tomato', category_id: 'cat-eating', name: 'Tomato', description: null },
		{ id: 'item-bread', category_id: 'cat-eating', name: 'Bread', description: null },
		{ id: 'item-mayo', category_id: 'cat-eating', name: 'Mayonnaise', description: null },
		// Exercise (cat-exercise) - physical activity
		{ id: 'item-running', category_id: 'cat-exercise', name: 'Running', description: null },
		{ id: 'item-weights', category_id: 'cat-exercise', name: 'Weights', description: null },
		{ id: 'item-yoga', category_id: 'cat-exercise', name: 'Yoga', description: null },
		// Recreation (cat-recreation) - leisure activities
		{ id: 'item-reading', category_id: 'cat-recreation', name: 'Reading', description: null },
		{ id: 'item-walking', category_id: 'cat-recreation', name: 'Walking', description: null },
		
		// === CONDITION ITEMS === (circumstances that may affect outcomes)
		// Stress (cat-stress) - mental/emotional pressures
		{ id: 'item-work-stress', category_id: 'cat-stress', name: 'Work Stress', description: null },
		{ id: 'item-time-pressure', category_id: 'cat-stress', name: 'Time Pressure', description: null },
		// Weather (cat-weather) - environmental conditions
		{ id: 'item-hot-weather', category_id: 'cat-weather', name: 'Hot Weather', description: null },
		{ id: 'item-cold-weather', category_id: 'cat-weather', name: 'Cold Weather', description: null },
		// Environment (cat-environment) - surroundings
		{ id: 'item-noise', category_id: 'cat-environment', name: 'Noise', description: null },
		{ id: 'item-air-quality', category_id: 'cat-environment', name: 'Poor Air Quality', description: null },
		
		// === OUTCOME ITEMS === (results you want to track/correlate)
		// Pain (cat-pain) - physical discomfort
		{ id: 'item-headache', category_id: 'cat-pain', name: 'Headache', description: null },
		{ id: 'item-stomach-pain', category_id: 'cat-pain', name: 'Stomach Pain', description: null },
		// Health (cat-health) - physical state
		{ id: 'item-good-sleep', category_id: 'cat-health', name: 'Good Sleep', description: null },
		{ id: 'item-rested', category_id: 'cat-health', name: 'Feeling Rested', description: null },
		// Well-being (cat-wellbeing) - mental/emotional state
		{ id: 'item-energy-level', category_id: 'cat-wellbeing', name: 'Energy Level', description: null },
		{ id: 'item-mood', category_id: 'cat-wellbeing', name: 'Mood', description: null },
	],
	
	item_quantifiers: [
		{ id: 'quant-headache-intensity', item_id: 'item-headache', name: 'Intensity', min_value: 1.0, max_value: 10.0, units: 'scale' },
		{ id: 'quant-headache-duration', item_id: 'item-headache', name: 'Duration', min_value: 0.0, max_value: null, units: 'minutes' },
		{ id: 'quant-stomach-intensity', item_id: 'item-stomach-pain', name: 'Intensity', min_value: 1.0, max_value: 10.0, units: 'scale' },
	],
	
	bundles: [
		{ id: 'bundle-blt', type_id: 'type-activity', name: 'BLT' },
	],
	
	bundle_members: [
		{ id: 'bm-blt-1', bundle_id: 'bundle-blt', item_id: 'item-bacon', member_bundle_id: null, display_order: 1 },
		{ id: 'bm-blt-2', bundle_id: 'bundle-blt', item_id: 'item-lettuce', member_bundle_id: null, display_order: 2 },
		{ id: 'bm-blt-3', bundle_id: 'bundle-blt', item_id: 'item-tomato', member_bundle_id: null, display_order: 3 },
		{ id: 'bm-blt-4', bundle_id: 'bundle-blt', item_id: 'item-bread', member_bundle_id: null, display_order: 4 },
		{ id: 'bm-blt-5', bundle_id: 'bundle-blt', item_id: 'item-mayo', member_bundle_id: null, display_order: 5 },
	],
	
	log_entries: [
		// Activities
		{ id: 'entry-breakfast', timestamp: '2025-11-26T08:00:00Z', type_id: 'type-activity', comment: 'Good breakfast to start the day' },
		{ id: 'entry-morning-run', timestamp: '2025-11-26T09:30:00Z', type_id: 'type-activity', comment: 'Morning jog in the park' },
		{ id: 'entry-lunch', timestamp: '2025-11-26T12:15:00Z', type_id: 'type-activity', comment: null },
		// Conditions (circumstances that may affect outcomes)
		{ id: 'entry-work-stress', timestamp: '2025-11-26T10:00:00Z', type_id: 'type-condition', comment: 'Deadline pressure at work' },
		{ id: 'entry-hot-day', timestamp: '2025-11-26T13:00:00Z', type_id: 'type-condition', comment: 'Very warm afternoon' },
		// Outcomes (results to track/correlate)
		{ id: 'entry-headache', timestamp: '2025-11-26T14:00:00Z', type_id: 'type-outcome', comment: 'Started after lunch' },
		{ id: 'entry-good-sleep', timestamp: '2025-11-27T07:00:00Z', type_id: 'type-outcome', comment: 'Woke up feeling great' },
	],
	
	log_entry_items: [
		// Breakfast (Activity)
		{ entry_id: 'entry-breakfast', item_id: 'item-omelette', source_bundle_id: null },
		{ entry_id: 'entry-breakfast', item_id: 'item-toast', source_bundle_id: null },
		{ entry_id: 'entry-breakfast', item_id: 'item-orange-juice', source_bundle_id: null },
		// Morning run (Activity)
		{ entry_id: 'entry-morning-run', item_id: 'item-running', source_bundle_id: null },
		// Lunch (Activity - BLT bundle)
		{ entry_id: 'entry-lunch', item_id: 'item-bacon', source_bundle_id: 'bundle-blt' },
		{ entry_id: 'entry-lunch', item_id: 'item-lettuce', source_bundle_id: 'bundle-blt' },
		{ entry_id: 'entry-lunch', item_id: 'item-tomato', source_bundle_id: 'bundle-blt' },
		{ entry_id: 'entry-lunch', item_id: 'item-bread', source_bundle_id: 'bundle-blt' },
		{ entry_id: 'entry-lunch', item_id: 'item-mayo', source_bundle_id: 'bundle-blt' },
		// Work stress (Condition)
		{ entry_id: 'entry-work-stress', item_id: 'item-work-stress', source_bundle_id: null },
		{ entry_id: 'entry-work-stress', item_id: 'item-time-pressure', source_bundle_id: null },
		// Hot day (Condition)
		{ entry_id: 'entry-hot-day', item_id: 'item-hot-weather', source_bundle_id: null },
		// Headache (Outcome)
		{ entry_id: 'entry-headache', item_id: 'item-headache', source_bundle_id: null },
		// Good sleep (Outcome)
		{ entry_id: 'entry-good-sleep', item_id: 'item-good-sleep', source_bundle_id: null },
		{ entry_id: 'entry-good-sleep', item_id: 'item-rested', source_bundle_id: null },
	],
	
	log_entry_quantifier_values: [
		{ entry_id: 'entry-headache', item_id: 'item-headache', quantifier_id: 'quant-headache-intensity', value: 7.0 },
		{ entry_id: 'entry-headache', item_id: 'item-headache', quantifier_id: 'quant-headache-duration', value: 45.0 },
	],
};

/**
 * Apply sample data to the database (development only)
 * Uses db.exec with parameters for simplicity
 */
export async function applySampleData(db: Database): Promise<void> {
	try {
		logger.info('Applying sample data for development...');
		
		logger.debug('Inserting items...');
		
		// Insert items (description is nullable)
		for (const item of SAMPLE_DATA.items) {
			await db.exec('INSERT INTO items (id, category_id, name, description) VALUES (?, ?, ?, ?)', 
				[item.id, item.category_id, item.name, item.description]);
		}
		logger.debug(`Inserted ${SAMPLE_DATA.items.length} items`);
		
		// Insert item quantifiers (max_value is nullable)
		logger.debug('Inserting item quantifiers...');
		for (const quant of SAMPLE_DATA.item_quantifiers) {
			await db.exec('INSERT INTO item_quantifiers (id, item_id, name, min_value, max_value, units) VALUES (?, ?, ?, ?, ?, ?)', 
				[quant.id, quant.item_id, quant.name, quant.min_value, quant.max_value, quant.units]);
		}
		logger.debug(`Inserted ${SAMPLE_DATA.item_quantifiers.length} quantifiers`);
		
		// Insert bundles
		logger.debug('Inserting bundles...');
		for (const bundle of SAMPLE_DATA.bundles) {
			await db.exec('INSERT INTO bundles (id, type_id, name) VALUES (?, ?, ?)', [bundle.id, bundle.type_id, bundle.name]);
		}
		logger.debug(`Inserted ${SAMPLE_DATA.bundles.length} bundles`);
		
		// Insert bundle members (member_bundle_id is nullable)
		logger.debug('Inserting bundle members...');
		for (const member of SAMPLE_DATA.bundle_members) {
			await db.exec('INSERT INTO bundle_members (id, bundle_id, item_id, member_bundle_id, display_order) VALUES (?, ?, ?, ?, ?)', 
				[member.id, member.bundle_id, member.item_id, member.member_bundle_id, member.display_order]);
		}
		logger.debug(`Inserted ${SAMPLE_DATA.bundle_members.length} bundle members`);
		
		// Insert log entries (comment is nullable)
		logger.debug('Inserting log entries...');
		for (const entry of SAMPLE_DATA.log_entries) {
			await db.exec('INSERT INTO log_entries (id, timestamp, type_id, comment) VALUES (?, ?, ?, ?)', 
				[entry.id, entry.timestamp, entry.type_id, entry.comment]);
		}
		logger.debug(`Inserted ${SAMPLE_DATA.log_entries.length} log entries`);
		
		// Insert log entry items (source_bundle_id is nullable)
		for (const lei of SAMPLE_DATA.log_entry_items) {
			await db.exec('INSERT INTO log_entry_items (entry_id, item_id, source_bundle_id) VALUES (?, ?, ?)', 
				[lei.entry_id, lei.item_id, lei.source_bundle_id]);
		}
		
		// Insert log entry quantifier values
		for (const qv of SAMPLE_DATA.log_entry_quantifier_values) {
			await db.exec('INSERT INTO log_entry_quantifier_values (entry_id, item_id, quantifier_id, value) VALUES (?, ?, ?, ?)', 
				[qv.entry_id, qv.item_id, qv.quantifier_id, qv.value]);
		}
		
		logger.info(`Sample data applied: ${SAMPLE_DATA.items.length} items, ${SAMPLE_DATA.bundles.length} bundles, ${SAMPLE_DATA.log_entries.length} log entries`);
	} catch (error) {
		logger.error('Failed to apply sample data:', error);
		throw error;
	}
}

