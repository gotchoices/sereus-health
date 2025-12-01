/**
 * Log History Data Adapter
 * 
 * Provides data for LogHistory screen using SQL database.
 * 
 * NOTE: This adapter now wraps the SQL database functions
 * but maintains the same interface for the screen component.
 */

import { getAllLogEntries, type LogEntry as DbLogEntry } from '../db/logEntries';

// Legacy interface for screen compatibility
export interface LogEntry {
	id: string;
	timestamp: string;
	type: string;
	items: string[];
	bundles?: string[];
	comment?: string;
}

/**
 * Get log history from SQL database
 * Transforms DB format to screen-expected format
 */
export async function getLogHistory(): Promise<LogEntry[]> {
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

/**
 * Legacy mock-based function - now deprecated
 * Kept for backward compatibility but always uses SQL
 */
export async function getLogHistoryMock(variant?: string): Promise<LogEntry[]> {
	// Ignore variant, always use SQL now
	return getLogHistory();
}
