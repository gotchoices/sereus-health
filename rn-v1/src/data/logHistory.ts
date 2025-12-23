/**
 * Log History Data Adapter
 * 
 * Provides data for LogHistory screen.
 * Switches between Quereus SQL and Appeus mock data based on USE_QUEREUS flag.
 * 
 * Variant is determined internally via getVariant() - callers don't need to know.
 */

import { USE_QUEREUS } from '../db/config';
import { ensureDatabaseInitialized } from '../db/init';
import { getAllLogEntries, type LogEntry as DbLogEntry } from '../db/logEntries';
import { getVariant } from '../mock';

// Import static mock data variants
import happyData from '../../mock/data/log-history.happy.json';
import emptyData from '../../mock/data/log-history.empty.json';
import errorData from '../../mock/data/log-history.error.json';

// Mock data structure (as stored in JSON files)
interface MockItem {
	id: string;
	name: string;
	category: string;
}

interface MockBundle {
	id: string;
	name: string;
}

interface MockLogEntry {
	id: string;
	timestamp: string;
	type: string;
	items: MockItem[];
	bundles: MockBundle[];
	quantifiers: Array<{
		itemId: string;
		name: string;
		value: number;
		units: string;
	}>;
	comment: string | null;
}

interface MockData {
	entries: MockLogEntry[];
}

const mockVariants: Record<string, MockData> = {
	happy: happyData,
	empty: emptyData,
	error: errorData,
};

// Screen-expected format (summary for list display)
export interface LogEntry {
	id: string;
	timestamp: string;
	type: string;
	items: string[];
	bundles?: string[];
	comment?: string;
}

// Detailed entry format (for editing)
export interface LogEntryDetail {
	id: string;
	timestamp: string;
	type: string;
	items: Array<{
		id: string;
		name: string;
		category: string;
	}>;
	bundles: Array<{
		id: string;
		name: string;
	}>;
	quantifiers: Array<{
		itemId: string;
		name: string;
		value: number;
		units: string;
	}>;
	comment: string | null;
}

/**
 * Get log history using Appeus mock data system (internal)
 */
async function getLogHistoryFromMock(): Promise<LogEntry[]> {
	const variant = getVariant();
	const mockData = mockVariants[variant] || mockVariants.happy;
	const rawEntries = mockData.entries || [];
	
	// Transform to expected format: extract item names from objects
	return rawEntries.map((entry: MockLogEntry): LogEntry => ({
		id: entry.id,
		timestamp: entry.timestamp,
		type: entry.type,
		items: entry.items.map((item: MockItem) => item.name),
		bundles: entry.bundles.length > 0 ? entry.bundles.map((bundle: MockBundle) => bundle.name) : undefined,
		comment: entry.comment || undefined,
	}));
}

/**
 * Get log history - public API for screens
 * Switches between SQL and mock based on USE_QUEREUS flag
 * Variant is determined internally from deep link context.
 */
export async function getLogHistory(): Promise<LogEntry[]> {
	if (!USE_QUEREUS) {
		// Use Appeus mock data system
		return getLogHistoryFromMock();
	}
	
	// Use Quereus SQL - ensure DB is initialized first
	await ensureDatabaseInitialized();
	const dbEntries = await getAllLogEntries();
	
	return dbEntries.map((entry: DbLogEntry): LogEntry => {
		// Extract item names and bundle names
		const itemNames: string[] = [];
		const bundleNames: Set<string> = new Set();
		
		for (const item of entry.items) {
			itemNames.push(item.name);
			if (item.sourceBundleName) {
				bundleNames.add(item.sourceBundleName);
			}
		}
		
		return {
			id: entry.id,
			timestamp: entry.timestamp,
			type: entry.typeName,
			items: itemNames,
			bundles: bundleNames.size > 0 ? Array.from(bundleNames) : undefined,
			comment: entry.comment || undefined,
		};
	});
}

/**
 * Get detailed entry by ID for editing
 */
async function getLogEntryByIdFromMock(entryId: string): Promise<LogEntryDetail | null> {
	const variant = getVariant();
	const mockData = mockVariants[variant] || mockVariants.happy;
	const rawEntries = mockData.entries || [];
	
	const entry = rawEntries.find((e: MockLogEntry) => e.id === entryId);
	if (!entry) return null;
	
	return {
		id: entry.id,
		timestamp: entry.timestamp,
		type: entry.type,
		items: entry.items.map((item: MockItem) => ({
			id: item.id,
			name: item.name,
			category: item.category,
		})),
		bundles: entry.bundles.map((bundle: MockBundle) => ({
			id: bundle.id,
			name: bundle.name,
		})),
		quantifiers: entry.quantifiers,
		comment: entry.comment,
	};
}

/**
 * Get detailed entry by ID - public API for screens
 * Used for edit/clone modes
 * Variant is determined internally from deep link context.
 */
export async function getLogEntryById(entryId: string): Promise<LogEntryDetail | null> {
	if (!USE_QUEREUS) {
		return getLogEntryByIdFromMock(entryId);
	}
	
	// TODO: Implement Quereus version when needed
	// For now, fall back to mock data
	return getLogEntryByIdFromMock(entryId);
}

/**
 * Import log entry structure (from CSV/YAML)
 */
export interface ImportLogEntry {
	timestamp: string;
	type: string;
	category: string;
	items: string[];
	comment?: string;
}

/**
 * Import result
 */
export interface ImportResult {
	imported: number;
	skipped: number;
	errors: string[];
}

/**
 * Import log entries from parsed data
 */
export async function importLogEntries(entries: ImportLogEntry[]): Promise<ImportResult> {
	if (!USE_QUEREUS) {
		// Mock mode: can't really import, just pretend
		console.log('[Mock] Would import', entries.length, 'entries');
		return { imported: entries.length, skipped: 0, errors: [] };
	}
	
	await ensureDatabaseInitialized();
	
	// Import via Quereus
	const { insertLogEntry } = await import('../db/logEntries');
	
	let imported = 0;
	let skipped = 0;
	const errors: string[] = [];
	
	for (const entry of entries) {
		try {
			// Check for duplicate (same timestamp + type + items)
			// For now, just insert - idempotency can be added later
			await insertLogEntry({
				timestamp: entry.timestamp,
				typeName: entry.type,
				categoryName: entry.category,
				items: entry.items.map(name => ({ name, categoryName: entry.category })),
				comment: entry.comment || null,
			});
			imported++;
		} catch (err) {
			console.error('Failed to import entry:', err);
			errors.push(`Failed to import entry at ${entry.timestamp}: ${err}`);
		}
	}
	
	return { imported, skipped, errors };
}
