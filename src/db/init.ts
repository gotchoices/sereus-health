/**
 * Database Initialization Singleton
 * 
 * Ensures database is initialized exactly once on first use.
 * Called by data adapters before any queries.
 */

import { getDatabase } from './index';
import { applySchema } from './schema';

let initPromise: Promise<void> | null = null;
let isInitialized = false;

/**
 * Initialize database with schema and seed data
 * Safe to call multiple times - only initializes once
 */
export async function ensureDatabaseInitialized(): Promise<void> {
	if (isInitialized) {
		return;
	}
	
	if (initPromise) {
		// Already initializing, wait for it
		return initPromise;
	}
	
	// Start initialization
	initPromise = (async () => {
		try {
			console.log('[DB] Initializing Quereus database...');
			const db = await getDatabase();
			console.log('[DB] Applying schema...');
			await applySchema(db, true); // Apply with seed data
			console.log('[DB] Schema applied successfully');
			isInitialized = true;
			console.log('[DB] Database initialized successfully');
		} catch (error) {
			console.error('[DB] Initialization failed:', error);
			initPromise = null; // Reset so it can be retried
			throw error;
		}
	})();
	
	await initPromise;
}

/**
 * Reset initialization state (for testing)
 */
export function resetInitializationState(): void {
	initPromise = null;
	isInitialized = false;
}

