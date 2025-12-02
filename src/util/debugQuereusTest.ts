/**
 * Minimal Quereus test for debugging in React Native
 * Tests basic table creation, insert, and query operations
 */

import { Database } from '@quereus/quereus';
import { createLogger } from './logger';

const logger = createLogger('Debug Test');

export async function runMinimalQuereusTest(): Promise<{
	success: boolean;
	message: string;
	details: string[];
}> {
	const details: string[] = [];
	
	try {
		logger.info('=== Starting Minimal Quereus Test ===');
		details.push('Starting test...');
		
		// Create a fresh database instance
		logger.info('Creating database...');
		const db = new Database();
		details.push('✓ Database created');
		
		// Create a simple table
		logger.info('Creating table...');
		await db.exec(`
			CREATE TABLE test_table (
				id TEXT PRIMARY KEY,
				name TEXT NOT NULL
			) USING memory
		`);
		details.push('✓ Table created');
		
		// Insert a row
		logger.info('Inserting row...');
		await db.exec('INSERT INTO test_table (id, name) VALUES (?, ?)', ['test-1', 'Test Row']);
		details.push('✓ Row inserted');
		
		// Query the row back
		logger.info('Querying row...');
		const rows = [];
		for await (const row of db.eval('SELECT * FROM test_table')) {
			rows.push(row);
		}
		details.push(`Query returned ${rows.length} row(s)`);
		
		if (rows.length === 0) {
			logger.error('FAILURE: No rows returned!');
			details.push('✗ FAILURE: Data did not persist!');
			return {
				success: false,
				message: 'Data persistence failed',
				details,
			};
		}
		
		if (rows[0].id === 'test-1' && rows[0].name === 'Test Row') {
			logger.info('SUCCESS: Data persisted correctly!');
			details.push('✓ SUCCESS: Data persisted correctly!');
			details.push(`  Retrieved: id="${rows[0].id}", name="${rows[0].name}"`);
			return {
				success: true,
				message: 'All tests passed!',
				details,
			};
		}
		
		logger.error('FAILURE: Data mismatch!');
		details.push('✗ FAILURE: Data retrieved but values incorrect');
		details.push(`  Expected: id="test-1", name="Test Row"`);
		details.push(`  Got: id="${rows[0].id}", name="${rows[0].name}"`);
		return {
			success: false,
			message: 'Data mismatch',
			details,
		};
		
	} catch (error) {
		const errorMsg = error instanceof Error ? error.message : String(error);
		logger.error('Test failed with error:', error);
		details.push(`✗ ERROR: ${errorMsg}`);
		return {
			success: false,
			message: 'Test threw an error',
			details,
		};
	}
}

