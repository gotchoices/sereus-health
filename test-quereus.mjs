#!/usr/bin/env node
/**
 * Minimal Quereus test script to isolate data persistence issue
 * Run with: node test-quereus.mjs
 */

import { Database } from '@quereus/quereus';

async function main() {
	console.log('=== Starting Quereus Test ===\n');
	
	const db = new Database();
	console.log('✓ Database created');
	
	// Declare and apply schema
	console.log('\n--- Schema Declaration ---');
	const schemaSQL = `
	declare schema main {
		table types (
			id text primary key,
			name text unique
		);
	}
	`;
	
	await db.exec(schemaSQL);
	console.log('✓ Schema declared');
	
	await db.exec('apply schema main');
	console.log('✓ Schema applied');
	
	// Insert data using db.exec with parameters
	console.log('\n--- Data Insertion ---');
	await db.exec('INSERT INTO types (id, name) VALUES (?, ?)', ['type-1', 'Type One']);
	console.log('✓ Inserted Type One');
	
	await db.exec('INSERT INTO types (id, name) VALUES (?, ?)', ['type-2', 'Type Two']);
	console.log('✓ Inserted Type Two');
	
	await db.exec('INSERT INTO types (id, name) VALUES (?, ?)', ['type-3', 'Type Three']);
	console.log('✓ Inserted Type Three');
	
	// Verify data using db.eval
	console.log('\n--- Verification with db.eval ---');
	const rows1 = [];
	for await (const row of db.eval('SELECT * FROM types')) {
		rows1.push(row);
	}
	console.log(`Found ${rows1.length} types:`, rows1);
	
	// Verify data using prepared statement
	console.log('\n--- Verification with prepared statement ---');
	const stmt = await db.prepare('SELECT * FROM types');
	const rows2 = [];
	for await (const row of stmt.all()) {
		rows2.push(row);
	}
	await stmt.finalize();
	console.log(`Found ${rows2.length} types:`, rows2);
	
	// Test with explicit transaction
	console.log('\n--- Testing with explicit transaction ---');
	await db.exec('BEGIN');
	await db.exec('INSERT INTO types (id, name) VALUES (?, ?)', ['type-4', 'Type Four']);
	await db.exec('COMMIT');
	console.log('✓ Inserted Type Four with explicit transaction');
	
	// Final verification
	console.log('\n--- Final Verification ---');
	const finalRows = [];
	for await (const row of db.eval('SELECT * FROM types ORDER BY id')) {
		finalRows.push(row);
	}
	console.log(`Final count: ${finalRows.length} types:`, finalRows);
	
	await db.close();
	console.log('\n✓ Database closed');
	console.log('\n=== Test Complete ===');
}

main().catch(err => {
	console.error('ERROR:', err);
	process.exit(1);
});

