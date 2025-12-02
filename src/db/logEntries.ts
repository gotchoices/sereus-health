/**
 * Log Entry CRUD Operations
 * 
 * Provides create, read, update, delete operations for log entries
 * and related data (items, quantifiers).
 * 
 * Switches between Quereus SQL and existing mock data based on USE_QUEREUS flag.
 */

import type { Database } from '@quereus/quereus';
import { getDatabase } from './index';
import { createLogger } from '../util/logger';

const logger = createLogger('DB LogEntries');

export interface LogEntry {
	id: string;
	timestamp: string; // ISO 8601 format
	typeId: string;
	typeName: string;
	comment: string | null;
	items: LogEntryItem[];
}

export interface LogEntryItem {
	id: string;
	name: string;
	categoryName: string;
	sourceBundleId: string | null;
	sourceBundleName: string | null;
	quantifiers: LogEntryQuantifier[];
}

export interface LogEntryQuantifier {
	id: string;
	name: string;
	value: number;
	units: string | null;
	minValue: number | null;
	maxValue: number | null;
}

export interface CreateLogEntryInput {
	timestamp: string;
	typeId: string;
	comment: string | null;
	items: CreateLogEntryItemInput[];
}

export interface CreateLogEntryItemInput {
	itemId: string;
	sourceBundleId: string | null;
	quantifiers: CreateLogEntryQuantifierInput[];
}

export interface CreateLogEntryQuantifierInput {
	quantifierId: string;
	value: number;
}

/**
 * Generate a unique ID for a log entry
 * Simple UUID v4-like string for now
 */
function generateId(prefix: string = 'entry'): string {
	const timestamp = Date.now().toString(36);
	const random = Math.random().toString(36).substring(2, 9);
	return `${prefix}-${timestamp}-${random}`;
}

/**
 * Create a new log entry with items and quantifiers
 */
export async function createLogEntry(input: CreateLogEntryInput): Promise<string> {
	const db = await getDatabase();
	const entryId = generateId('entry');
	
	// Start transaction
	await db.exec('BEGIN');
	
	try {
		// Insert log entry
		await db.exec(`
			INSERT INTO log_entries (id, timestamp, type_id, comment)
			VALUES (?, ?, ?, ?)
		`, [entryId, input.timestamp, input.typeId, input.comment]);
		
		// Insert each item
		for (const item of input.items) {
			await db.exec(`
				INSERT INTO log_entry_items (entry_id, item_id, source_bundle_id)
				VALUES (?, ?, ?)
			`, [entryId, item.itemId, item.sourceBundleId]);
			
			// Insert quantifier values for this item
			for (const quant of item.quantifiers) {
				await db.exec(`
					INSERT INTO log_entry_quantifier_values (entry_id, item_id, quantifier_id, value)
					VALUES (?, ?, ?, ?)
				`, [entryId, item.itemId, quant.quantifierId, quant.value]);
			}
		}
		
		// Commit transaction
		await db.exec('COMMIT');
		
		return entryId;
	} catch (error) {
		// Rollback on error
		await db.exec('ROLLBACK');
		throw error;
	}
}

/**
 * Get all log entries ordered by timestamp (newest first)
 * NOTE: Only called when USE_QUEREUS = true
 */
export async function getAllLogEntries(): Promise<LogEntry[]> {
	const db = await getDatabase();
	
	// Get all entries with their type names
	const entryQuery = `
		SELECT 
			e.id,
			e.timestamp,
			e.type_id as typeId,
			t.name as typeName,
			e.comment
		FROM log_entries e
		JOIN types t ON t.id = e.type_id
		ORDER BY e.timestamp DESC
	`;
	logger.sql(entryQuery);
	
	const entryStmt = await db.prepare(entryQuery);
	const entryRows = [];
	for await (const row of entryStmt.all()) {
		entryRows.push(row);
	}
	await entryStmt.finalize();
	
	logger.debug(`getAllLogEntries found ${entryRows.length} entries`);
	
	// For each entry, fetch its items and quantifiers
	const entries: LogEntry[] = [];
	
	for (const entryRow of entryRows) {
		const entryId = entryRow.id as string;
		
		// Get items for this entry
		const itemStmt = await db.prepare(`
			SELECT 
				i.id,
				i.name,
				c.name as categoryName,
				lei.source_bundle_id as sourceBundleId,
				b.name as sourceBundleName
			FROM log_entry_items lei
			JOIN items i ON i.id = lei.item_id
			JOIN categories c ON c.id = i.category_id
			LEFT JOIN bundles b ON b.id = lei.source_bundle_id
			WHERE lei.entry_id = ?
			ORDER BY i.name ASC
		`);
		const itemRows = [];
		for await (const row of itemStmt.all([entryId])) {
			itemRows.push(row);
		}
		await itemStmt.finalize();
		
		const items: LogEntryItem[] = [];
		
		for (const itemRow of itemRows) {
			const itemId = itemRow.id as string;
			
			// Get quantifiers for this item in this entry
			const quantStmt = await db.prepare(`
				SELECT 
					q.id,
					q.name,
					qv.value,
					q.units,
					q.min_value as minValue,
					q.max_value as maxValue
				FROM log_entry_quantifier_values qv
				JOIN item_quantifiers q ON q.id = qv.quantifier_id
				WHERE qv.entry_id = ? AND qv.item_id = ?
				ORDER BY q.name ASC
			`);
			const quantRows = [];
			for await (const row of quantStmt.all([entryId, itemId])) {
				quantRows.push(row);
			}
			await quantStmt.finalize();
			
			items.push({
				id: itemId,
				name: itemRow.name as string,
				categoryName: itemRow.categoryName as string,
				sourceBundleId: itemRow.sourceBundleId as string | null,
				sourceBundleName: itemRow.sourceBundleName as string | null,
				quantifiers: quantRows.map(qr => ({
					id: qr.id as string,
					name: qr.name as string,
					value: qr.value as number,
					units: qr.units as string | null,
					minValue: qr.minValue as number | null,
					maxValue: qr.maxValue as number | null,
				})),
			});
		}
		
		entries.push({
			id: entryId,
			timestamp: entryRow.timestamp as string,
			typeId: entryRow.typeId as string,
			typeName: entryRow.typeName as string,
			comment: entryRow.comment as string | null,
			items,
		});
	}
	
	return entries;
}

/**
 * Get a single log entry by ID
 */
export async function getLogEntryById(entryId: string): Promise<LogEntry | null> {
	const db = await getDatabase();
	
	// Get entry with type name
	const entryRow = await db.prepare(`
		SELECT 
			e.id,
			e.timestamp,
			e.type_id as typeId,
			t.name as typeName,
			e.comment
		FROM log_entries e
		JOIN types t ON t.id = e.type_id
		WHERE e.id = ?
	`).get([entryId]);
	
	if (!entryRow) {
		return null;
	}
	
	// Get items for this entry
	const itemStmt2 = await db.prepare(`
		SELECT 
			i.id,
			i.name,
			c.name as categoryName,
			lei.source_bundle_id as sourceBundleId,
			b.name as sourceBundleName
		FROM log_entry_items lei
		JOIN items i ON i.id = lei.item_id
		JOIN categories c ON c.id = i.category_id
		LEFT JOIN bundles b ON b.id = lei.source_bundle_id
		WHERE lei.entry_id = ?
		ORDER BY i.name ASC
	`);
	const itemRows = [];
	for await (const row of itemStmt2.all([entryId])) {
		itemRows.push(row);
	}
	await itemStmt2.finalize();
	
	const items: LogEntryItem[] = [];
	
	for (const itemRow of itemRows) {
		const itemId = itemRow.id as string;
		
		// Get quantifiers for this item in this entry
		const quantStmt2 = await db.prepare(`
			SELECT 
				q.id,
				q.name,
				qv.value,
				q.units,
				q.min_value as minValue,
				q.max_value as maxValue
			FROM log_entry_quantifier_values qv
			JOIN item_quantifiers q ON q.id = qv.quantifier_id
			WHERE qv.entry_id = ? AND qv.item_id = ?
			ORDER BY q.name ASC
		`);
		const quantRows = [];
		for await (const row of quantStmt2.all([entryId, itemId])) {
			quantRows.push(row);
		}
		await quantStmt2.finalize();
		
		items.push({
			id: itemId,
			name: itemRow.name as string,
			categoryName: itemRow.categoryName as string,
			sourceBundleId: itemRow.sourceBundleId as string | null,
			sourceBundleName: itemRow.sourceBundleName as string | null,
			quantifiers: quantRows.map(qr => ({
				id: qr.id as string,
				name: qr.name as string,
				value: qr.value as number,
				units: qr.units as string | null,
				minValue: qr.minValue as number | null,
				maxValue: qr.maxValue as number | null,
			})),
		});
	}
	
	return {
		id: entryId,
		timestamp: entryRow.timestamp as string,
		typeId: entryRow.typeId as string,
		typeName: entryRow.typeName as string,
		comment: entryRow.comment as string | null,
		items,
	};
}

/**
 * Update an existing log entry
 * Replaces all items and quantifiers (full replacement strategy)
 */
export async function updateLogEntry(entryId: string, input: CreateLogEntryInput): Promise<void> {
	const db = await getDatabase();
	
	// Start transaction
	await db.exec('BEGIN');
	
	try {
		// Update entry metadata
		await db.exec(`
			UPDATE log_entries
			SET timestamp = ?, type_id = ?, comment = ?
			WHERE id = ?
		`, [input.timestamp, input.typeId, input.comment, entryId]);
		
		// Delete existing items and quantifiers (cascade will handle quantifiers)
		await db.exec(`
			DELETE FROM log_entry_items WHERE entry_id = ?
		`, [entryId]);
		
		await db.exec(`
			DELETE FROM log_entry_quantifier_values WHERE entry_id = ?
		`, [entryId]);
		
		// Insert new items
		for (const item of input.items) {
			await db.exec(`
				INSERT INTO log_entry_items (entry_id, item_id, source_bundle_id)
				VALUES (?, ?, ?)
			`, [entryId, item.itemId, item.sourceBundleId]);
			
			// Insert quantifier values for this item
			for (const quant of item.quantifiers) {
				await db.exec(`
					INSERT INTO log_entry_quantifier_values (entry_id, item_id, quantifier_id, value)
					VALUES (?, ?, ?, ?)
				`, [entryId, item.itemId, quant.quantifierId, quant.value]);
			}
		}
		
		// Commit transaction
		await db.exec('COMMIT');
	} catch (error) {
		// Rollback on error
		await db.exec('ROLLBACK');
		throw error;
	}
}

/**
 * Delete a log entry and all related items/quantifiers
 * Cascade deletion handled by schema
 */
export async function deleteLogEntry(entryId: string): Promise<void> {
	const db = await getDatabase();
	
	await db.exec(`
		DELETE FROM log_entries WHERE id = ?
	`, [entryId]);
}

