/**
 * Diario Database Initialization
 * 
 * Provides a singleton Quereus database instance with MemoryTableModule
 * for in-memory SQL storage of log entries, taxonomy, and app data.
 */

import { Database, MemoryTableModule } from '@quereus/quereus';
import { applySchema } from './schema';

let dbInstance: Database | null = null;

/**
 * Get or create the singleton database instance
 */
export async function getDatabase(): Promise<Database> {
	if (dbInstance) {
		return dbInstance;
	}

	const db = new Database();
	
	// Register memory table module for in-memory storage
	db.registerVtabModule('memory', new MemoryTableModule());
	
	// Set memory as default module so CREATE TABLE works without USING clause
	await db.exec("pragma default_vtab_module = 'memory'");
	
	// Set default column nullability (Quereus defaults to NOT NULL)
	// We keep NOT NULL as default per Third Manifesto principles
	await db.exec("pragma default_column_nullability = 'not_null'");
	
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

