/**
 * Log History Data Adapter
 * 
 * Provides data for LogHistory screen.
 * Switches between Quereus SQL and Appeus mock data based on USE_QUEREUS flag.
 */

import { USE_QUEREUS } from '../db/config';
import { getAllLogEntries, type LogEntry as DbLogEntry } from '../db/logEntries';

// Import static mock data variants
import happyData from '../../mock/data/log-history.happy.json';
import emptyData from '../../mock/data/log-history.empty.json';
import errorData from '../../mock/data/log-history.error.json';

const mockVariants: Record<string, any> = {
	happy: happyData,
	empty: emptyData,
	error: errorData,
};

export interface LogEntry {
	id: string;
	timestamp: string;
	type: string;
	items: string[];
	bundles?: string[];
	comment?: string;
}

/**
 * Get log history using Appeus mock data system
 */
export async function getLogHistoryMock(variant: string = 'happy'): Promise<LogEntry[]> {
	const mockData = mockVariants[variant] || mockVariants.happy;
	return mockData.entries || [];
}

/**
 * Get log history - switches between SQL and mock based on feature flag
 */
export async function getLogHistory(): Promise<LogEntry[]> {
	if (!USE_QUEREUS) {
		// Use Appeus mock data system
		return getLogHistoryMock('happy');
	}
	
	// Use Quereus SQL
	const dbEntries = await getAllLogEntries();
	
	return dbEntries.map(entry => {
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
