/**
 * Log History Data Adapter
 * 
 * Provides data for LogHistory screen.
 * Switches between Quereus SQL and Appeus mock data based on USE_QUEREUS flag.
 */

import { USE_QUEREUS } from '../db/config';
import { ensureDatabaseInitialized } from '../db/init';
import { getAllLogEntries, type LogEntry as DbLogEntry } from '../db/logEntries';

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

// Screen-expected format
export interface LogEntry {
	id: string;
	timestamp: string;
	type: string;
	items: string[];
	bundles?: string[];
	comment?: string;
}

/**
 * Get log history using Appeus mock data system (internal)
 */
async function getLogHistoryFromMock(variant: string = 'happy'): Promise<LogEntry[]> {
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
 * 
 * @param variant - Mock variant to use ('happy', 'empty', 'error'). Ignored when USE_QUEREUS=true.
 */
export async function getLogHistory(variant: string = 'happy'): Promise<LogEntry[]> {
	if (!USE_QUEREUS) {
		// Use Appeus mock data system
		return getLogHistoryFromMock(variant);
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
