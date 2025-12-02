/**
 * Database Initialization Singleton
 * 
 * Ensures database is initialized exactly once on first use.
 * Called by data adapters before any queries.
 */

import { getDatabase } from './index';
import { applySchema, applyProductionSeeds } from './schema';
import { createLogger } from '../util/logger';

const logger = createLogger('DB Init');

// Import sample data only in development
let applySampleData: ((db: any) => Promise<void>) | null = null;
if (__DEV__) {
	// Dynamic import to exclude from production bundle
	applySampleData = require('./schema.samples').applySampleData;
}

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
			logger.debug('Got database instance');
			
			// Check if schema exists by querying the schema() function
			let schemaExists = false;
			try {
				logger.debug('Checking if schema exists...');
				const result = await db.prepare("SELECT name FROM schema() WHERE type = 'table' AND name = 'types'").get();
				schemaExists = result !== undefined;
				logger.debug(`Schema exists: ${schemaExists}`);
			} catch (error) {
				// Schema doesn't exist or query failed
				logger.debug('Schema check failed, assuming it does not exist');
				schemaExists = false;
			}
			
			if (!schemaExists) {
				// First-time initialization: apply schema
				logger.info('First-time database setup - applying schema...');
				await applySchema(db);
				logger.debug('Schema applied');
			} else {
				logger.debug('Schema already exists, skipping schema creation');
			}
			
			// Check if data is seeded
			logger.debug('Checking if data is seeded...');
			const typeCountStmt = await db.prepare('SELECT COUNT(*) as count FROM types');
			const typeCountResult = await typeCountStmt.get();
			const typeCount = (typeCountResult?.count as number) || 0;
			logger.debug(`Type count check: ${typeCount} types found`);
			
			if (typeCount === 0) {
				logger.debug('No types found, will seed data...');
				// Apply production seed data
				logger.info('About to call applyProductionSeeds...');
				try {
					await applyProductionSeeds(db);
					logger.info('applyProductionSeeds completed successfully');
				} catch (error) {
					logger.error('applyProductionSeeds failed:', error);
					throw error;
				}
				
				// Apply sample data in development
				if (__DEV__ && applySampleData) {
					logger.info('About to call applySampleData...');
					try {
						await applySampleData(db);
						logger.info('applySampleData completed successfully');
					} catch (error) {
						logger.error('applySampleData failed:', error);
						throw error;
					}
				}
				
				// Verify initialization
				const verifyTypes = await db.prepare('SELECT id, name FROM types');
				const typeRows = [];
				for await (const row of verifyTypes.all()) {
					typeRows.push(row);
				}
				logger.debug(`Types in DB: ${typeRows.length} - ${typeRows.map(t => t.name).join(', ')}`);
				
				const verifyEntries = await db.prepare('SELECT id FROM log_entries');
				const entryRows = [];
				for await (const row of verifyEntries.all()) {
					entryRows.push(row);
				}
				logger.debug(`Log entries in DB: ${entryRows.length}`);
			} else {
				logger.info(`Database already initialized (${typeCount} types found)`);
			}
			
			isInitialized = true;
			logger.info('Database ready');
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

