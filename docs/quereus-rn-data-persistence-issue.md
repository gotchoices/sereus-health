# Quereus Data Persistence Issue in React Native

## Summary

Quereus works correctly in Node.js but experiences a critical data persistence issue in React Native: INSERT statements execute without error, but subsequent SELECT queries return no rows. Tables are created successfully and constraints are enforced, but data does not persist.

## Environment

- **Platform**: React Native 0.82.1 (Android emulator)
- **Quereus Version**: Latest from workspace (packages/quereus)
- **JavaScript Engine**: React Native's JavaScriptCore/Hermes
- **Polyfills**: `@ungap/structured-clone` for `structuredClone`

## Issue Description

### What Works
- ✅ Database instance creation
- ✅ Schema declaration (`declare schema main`)
- ✅ Schema application (`apply schema main`)
- ✅ Table creation (constraints are enforced)
- ✅ INSERT statements execute without errors
- ✅ SELECT queries execute without errors

### What Doesn't Work
- ❌ Data persistence: After INSERT, SELECT returns 0 rows
- ❌ Both declarative schema and direct DDL exhibit the same issue

### Evidence

```
[DB Schema] Applying production seed data...
[DB Schema] Inserted 3 types
[DB Schema] Inserted 9 categories
[DB Schema] Inserted 1 log entries
[DB Schema] Verifying seed data...
[DB Schema] Verification: Found 0 types: 
[DB Schema] CRITICAL: Seed data did not persist! Inserts succeeded but queries return no rows.
```

When inserting sample data (items with nullable description column):
```
[DB Samples] Inserting items...
[DB Samples] Failed: QuereusError: NOT NULL constraint failed: items.description
```
This proves tables exist and constraints work, but the previous inserts (types, categories) have vanished.

## Code Examples

### Node.js Test (WORKS)
```javascript
import { Database } from '@quereus/quereus';

const db = new Database();

// Declarative schema
await db.exec(`
  declare schema main using (default_vtab_module = 'memory') {
    table types (
      id text primary key,
      name text unique
    );
  }
`);
await db.exec('apply schema main');

// Insert data
await db.exec('INSERT INTO types (id, name) VALUES (?, ?)', ['type-1', 'Type One']);

// Query data
const rows = [];
for await (const row of db.eval('SELECT * FROM types')) {
  rows.push(row);
}
console.log(rows); // ✓ Returns 1 row
```

### React Native (FAILS)
```typescript
import { Database } from '@quereus/quereus';

const db = new Database();

// Same exact code as Node.js test
await db.exec(SCHEMA_SQL); // declare schema main using (default_vtab_module = 'memory') { ... }
await db.exec('apply schema main');

// Insert data
await db.exec('INSERT INTO types (id, name) VALUES (?, ?)', ['type-1', 'Type One']);

// Query data
const rows = [];
for await (const row of db.eval('SELECT * FROM types')) {
  rows.push(row);
}
console.log(rows); // ✗ Returns 0 rows (but no error!)
```

## Observations

1. **No JavaScript Errors**: All operations complete without throwing errors
2. **Constraint Enforcement**: NOT NULL constraints are enforced, proving tables exist
3. **Autocommit Expected**: Using `db.exec()` which should autocommit each statement
4. **Singleton Database**: Only one Database instance is created
5. **Async/Await Properly Used**: All async operations are awaited

## Attempts to Resolve

1. ❌ **Explicit Transactions**: Tried wrapping inserts in BEGIN/COMMIT (same result)
2. ❌ **Direct DDL Instead of Declarative Schema**: Used CREATE TABLE directly (same result)
3. ❌ **Prepared Statements**: Used `prepare()` + `run()` instead of `db.exec()` (same result)
4. ❌ **Parameter Variations**: Tried different parameter binding styles (same result)

## Questions for Quereus Author

1. Is there a known issue with memory table data persistence in React Native?
2. Are there any React Native-specific initialization steps required?
3. Could this be related to React Native's event loop or microtask queue?
4. Is there a way to verify that the memory table manager is properly initialized?
5. Could this be related to how React Native bundles/transforms the Quereus code?

## Additional Context

- Works perfectly in Node.js with identical code
- React Native uses Metro bundler (not Webpack/Vite)
- App is using Yarn workspaces with `hoistingLimits: "dependencies"`
- `structuredClone` is polyfilled with `@ungap/structured-clone`
- No custom Metro transforms applied to Quereus code

## Relevant Files

- Schema definition: `src/db/schema.ts`
- Database initialization: `src/db/init.ts`
- Singleton instance: `src/db/index.ts`
- Working Node.js test: `test-quereus.mjs` (can be provided)

