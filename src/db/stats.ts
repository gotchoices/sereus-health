/**
 * Database Statistics Queries
 * 
 * Provides usage statistics for types, categories, and items
 * to support smart defaults and usage-based ordering.
 * 
 * Replaces mock data with real SQL queries against Quereus database.
 */

import type { Database } from '@quereus/quereus';
import { getDatabase } from './index';

export interface TypeStat {
	id: string;
	name: string;
	usageCount: number;
}

export interface CategoryStat {
	id: string;
	name: string;
	usageCount: number;
}

export interface ItemStat {
	id: string;
	name: string;
	usageCount: number;
	isBundle: boolean;
}

/**
 * Get usage statistics for all types
 * Returns types sorted by usage count (descending), then alphabetically
 */
export async function getTypeStats(): Promise<TypeStat[]> {
	const db = await getDatabase();
	
	const results = await db.prepare(`
		SELECT 
			t.id,
			t.name,
			COUNT(e.id) as usageCount
		FROM types t
		LEFT JOIN log_entries e ON e.type_id = t.id
		GROUP BY t.id, t.name
		ORDER BY usageCount DESC, t.name ASC
	`).all();
	
	return results.map(row => ({
		id: row.id as string,
		name: row.name as string,
		usageCount: (row.usageCount as number) || 0,
	}));
}

/**
 * Get usage statistics for categories within a type
 * Returns categories sorted by usage count (descending), then alphabetically
 */
export async function getCategoryStats(typeId: string): Promise<CategoryStat[]> {
	const db = await getDatabase();
	
	const results = await db.prepare(`
		SELECT 
			c.id,
			c.name,
			COUNT(DISTINCT e.id) as usageCount
		FROM categories c
		LEFT JOIN items i ON i.category_id = c.id
		LEFT JOIN log_entry_items lei ON lei.item_id = i.id
		LEFT JOIN log_entries e ON e.id = lei.entry_id
		WHERE c.type_id = ?
		GROUP BY c.id, c.name
		ORDER BY usageCount DESC, c.name ASC
	`).all([typeId]);
	
	return results.map(row => ({
		id: row.id as string,
		name: row.name as string,
		usageCount: (row.usageCount as number) || 0,
	}));
}

/**
 * Get usage statistics for items within a category
 * Returns items sorted by usage count (descending), then alphabetically
 * Includes both individual items and bundles
 */
export async function getItemStats(categoryId: string): Promise<ItemStat[]> {
	const db = await getDatabase();
	
	// Get individual items with usage counts
	const itemResults = await db.prepare(`
		SELECT 
			i.id,
			i.name,
			COUNT(DISTINCT lei.entry_id) as usageCount,
			0 as isBundle
		FROM items i
		LEFT JOIN log_entry_items lei ON lei.item_id = i.id
		WHERE i.category_id = ?
		GROUP BY i.id, i.name
	`).all([categoryId]);
	
	// Get bundles with usage counts (via their expanded items)
	const bundleResults = await db.prepare(`
		SELECT 
			b.id,
			b.name,
			COUNT(DISTINCT lei.entry_id) as usageCount,
			1 as isBundle
		FROM bundles b
		LEFT JOIN log_entry_items lei ON lei.source_bundle_id = b.id
		GROUP BY b.id, b.name
	`).all();
	
	// Combine and sort
	const combined = [
		...itemResults.map(row => ({
			id: row.id as string,
			name: row.name as string,
			usageCount: (row.usageCount as number) || 0,
			isBundle: false,
		})),
		...bundleResults.map(row => ({
			id: row.id as string,
			name: row.name as string,
			usageCount: (row.usageCount as number) || 0,
			isBundle: true,
		})),
	];
	
	// Sort by usage count desc, then name asc
	combined.sort((a, b) => {
		if (b.usageCount !== a.usageCount) {
			return b.usageCount - a.usageCount;
		}
		return a.name.localeCompare(b.name);
	});
	
	return combined;
}

/**
 * Get the most commonly used type
 * Returns null if no types exist
 */
export async function getMostCommonType(): Promise<TypeStat | null> {
	const types = await getTypeStats();
	return types.length > 0 ? types[0] : null;
}

/**
 * Get the most commonly used category within a type
 * Returns null if no categories exist for that type
 */
export async function getMostCommonCategory(typeId: string): Promise<CategoryStat | null> {
	const categories = await getCategoryStats(typeId);
	return categories.length > 0 ? categories[0] : null;
}

