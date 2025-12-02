/**
 * Sereus Health Database Initialization
 * 
 * Provides a singleton Quereus database instance for in-memory SQL storage
 * of log entries, taxonomy, and app data.
 * 
 * NOTE: As of Quereus latest version:
 * - MemoryTableModule is registered by default
 * - default_vtab_module is 'memory' by default
 * - default_column_nullability is 'not_null' by default (Third Manifesto)
 */

import { Database } from '@quereus/quereus';
import { applySchema } from './schema';
import { createLogger } from '../util/logger';

const logger = createLogger('DB Instance');

let dbInstance: Database | null = null;
let instanceId = 0;

/**
 * Get or create the singleton database instance
 */
export async function getDatabase(): Promise<Database> {
	if (dbInstance) {
		return dbInstance;
	}

	// MemoryTableModule and sensible defaults are now built-in
	instanceId++;
	logger.info(`Creating database instance #${instanceId}`);
	const db = new Database();
	
	dbInstance = db;
	return db;
}

/**
 * Close and reset the database instance
 * Useful for testing or app reset
 */
export async function closeDatabase(): Promise<void> {
	if (dbInstance) {
		await dbInstance.close();
		dbInstance = null;
	}
}

/**
 * Reset database to initial state
 * Drops all data and re-applies schema with seed
 */
export async function resetDatabase(): Promise<void> {
	await closeDatabase();
	const db = await getDatabase();
	
	// Re-apply schema with seed data
	await applySchema(db, true);
}

