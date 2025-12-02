/**
 * Database Initialization Singleton
 * 
 * Ensures database is initialized exactly once on first use.
 * Called by data adapters before any queries.
 */

import { getDatabase } from './index';
import { applySchema } from './schema';
import { createLogger } from '../util/logger';

const logger = createLogger('DB Init');

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
			logger.info('Initializing Quereus database...');
			const db = await getDatabase();
			logger.debug('Applying schema...');
			await applySchema(db, true); // Apply with seed data
			logger.debug('Schema applied successfully');
			
			// Verify seed data was loaded
			const typeCountStmt = await db.prepare('SELECT COUNT(*) as count FROM types');
			const typeCountResult = await typeCountStmt.get();
			logger.debug(`Types seeded: ${typeCountResult?.count || 0}`);
			
			const entryCountStmt = await db.prepare('SELECT COUNT(*) as count FROM log_entries');
			const entryCountResult = await entryCountStmt.get();
			logger.debug(`Log entries seeded: ${entryCountResult?.count || 0}`);
			
			isInitialized = true;
			logger.info('Database initialized successfully');
		} catch (error) {
			logger.error('Initialization failed:', error);
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

