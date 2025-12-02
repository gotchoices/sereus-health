# Quereus Usage Evaluation - Sereus Health App

## Current Implementation vs. Latest Quereus Best Practices

### Summary of Findings

✅ **Good**: Our initialization and basic usage patterns are correct
⚠️ **Improvement Needed**: We can simplify code by using `db.exec()` with parameters instead of prepared statements for simple inserts
⚠️ **Workaround to Remove**: The NULL handling workaround (string interpolation) was for old Quereus bugs that may be fixed now

---

## 🎉 Implementation Status (Dec 2, 2025)

All recommendations have been implemented! The codebase now uses modern Quereus best practices:

### Changes Made:
1. **`src/db/index.ts`**: Removed redundant MemoryTableModule registration and pragma statements
2. **`src/db/schema.ts`**: 
   - Replaced prepared statements with `db.exec(sql, params)` for seed data insertion
   - Replaced `asyncIterableToArray()` with `db.eval()` for verification queries
   - Removed import of `asyncIterableToArray`
3. **`src/db/schema.samples.ts`**: Removed all NULL string interpolation workarounds, now using parameters directly
4. **`src/db/logEntries.ts`**:
   - Replaced `asyncIterableToArray()` with `for await` loop pattern for query results
   - Replaced all prepared statements with `db.exec(sql, params)` in CRUD operations
   - Added proper `finalize()` calls for remaining prepared statements
   - Note: Avoided `Array.fromAsync()` as it's ES2023 and not available in React Native
5. **`index.js`**: Upgraded from JSON.parse/stringify polyfill to `@ungap/structured-clone`
6. **`package.json`**: Added `@ungap/structured-clone` dependency

### What to Test:
- NULL handling in queries (should work seamlessly now)
- All database operations (CRUD for log entries)
- Sample data seeding in development mode

---

## 1. Database Initialization

### Current Implementation (`src/db/index.ts`)
```typescript
import { Database, MemoryTableModule } from '@quereus/quereus';

const db = new Database();
db.registerVtabModule('memory', new MemoryTableModule());
await db.exec("pragma default_vtab_module = 'memory'");
await db.exec("pragma default_column_nullability = 'not_null'");
```

### Latest Quereus Best Practice
```typescript
import { Database } from 'quereus';

const db = new Database();
// MemoryTableModule is now registered by default!
// default_vtab_module is 'memory' by default!
// default_column_nullability is 'not_null' by default per Third Manifesto!
```

**✅ RECOMMENDATION**: 
- Remove explicit `MemoryTableModule` import and registration - it's built-in now
- Remove the pragma statements - they're already the defaults
- Simplify to just `const db = new Database()`

---

## 2. Parameter Handling - The Big Change!

### Current Implementation (Workarounds for Old Bugs)

**Problem 1: We avoid `db.exec()` with NULL parameters**
```typescript
// Current workaround (schema.samples.ts line 113)
const maxVal = quant.max_value === null ? 'NULL' : quant.max_value;
await db.exec(`INSERT INTO item_quantifiers (...) VALUES ('${quant.id}', ..., ${maxVal}, ...)`);
```

**Problem 2: We use prepared statements for everything**
```typescript
// Current approach (schema.ts line 201)
const typeStmt = await db.prepare('INSERT INTO types (id, name) VALUES (?, ?)');
for (const type of PRODUCTION_SEEDS.types) {
    await typeStmt.run([type.id, type.name]);
}
await typeStmt.finalize();
```

### Latest Quereus Best Practice

**`db.exec()` now accepts parameters!**

According to the docs and source code:
```typescript
async exec(sql: string, params?: SqlParameters): Promise<void>
```

Where `SqlParameters = Record<string, SqlValue> | SqlValue[]`

**Examples from docs/usage.md:**
```typescript
// Positional parameters
await db.exec("insert into users (name, email) values (?, ?)", ["User A", "example@sample.com"]);

// Named parameters  
await db.exec("insert into users (name) values (?)", ["User 1"]);
```

**✅ RECOMMENDATION**: Simplify our seed insertion code:

```typescript
// Instead of this:
const typeStmt = await db.prepare('INSERT INTO types (id, name) VALUES (?, ?)');
for (const type of PRODUCTION_SEEDS.types) {
    await typeStmt.run([type.id, type.name]);
}
await typeStmt.finalize();

// Do this:
for (const type of PRODUCTION_SEEDS.types) {
    await db.exec('INSERT INTO types (id, name) VALUES (?, ?)', [type.id, type.name]);
}
```

**For NULL values:**
```typescript
// Instead of string interpolation:
const maxVal = quant.max_value === null ? 'NULL' : quant.max_value;
await db.exec(`INSERT ... VALUES (..., ${maxVal}, ...)`);

// Use parameters directly (NULL handling should work now):
await db.exec('INSERT INTO item_quantifiers (id, item_id, name, min_value, max_value, units) VALUES (?, ?, ?, ?, ?, ?)', 
    [quant.id, quant.item_id, quant.name, quant.min_value, quant.max_value, quant.units]);
```

---

## 3. Query Results

### Current Implementation
```typescript
import { asyncIterableToArray } from '@quereus/quereus';

const verifyStmt = await db.prepare('SELECT * FROM types');
const allTypes = await asyncIterableToArray(verifyStmt.all());
```

### Latest Quereus Best Practice

**Option A: Use `db.eval()` for iteration**
```typescript
const allTypes = [];
for await (const type of db.eval('SELECT * FROM types')) {
    allTypes.push(type);
}
```

**Option B: Use `stmt.all()` directly (it returns an async iterable)**
```typescript
const stmt = await db.prepare('SELECT * FROM types');
try {
    const allTypes = [];
    for await (const type of stmt.all()) {
        allTypes.push(type);
    }
} finally {
    await stmt.finalize();
}
```

**✅ RECOMMENDATION**: 
- `stmt.all()` already returns an async iterable, you can iterate with `for await`
- Remove dependency on `asyncIterableToArray` helper
- For simple queries, `db.eval()` is cleaner and handles finalization
- **Note**: `Array.fromAsync()` is ES2023 and not available in React Native yet

---

## 4. Type System - Now Strongly Typed!

### Key Changes in Latest Quereus

**From README:**
> "Quereus is strong typed now. The author says we should not need to do prepared execution but can give parameters to db.exec just fine."

**Type Definition:**
```typescript
type SqlParameters = Record<string, SqlValue> | SqlValue[];
type SqlValue = string | number | bigint | boolean | Uint8Array | null;
```

**This means:**
- ✅ NULL is a valid SqlValue
- ✅ Parameters are type-checked
- ✅ `db.exec()` accepts parameters just like prepared statements
- ✅ No more NULL handling workarounds needed

**When to use prepared vs exec:**

**Use `db.exec(sql, params)` for:**
- Single inserts/updates/deletes with parameters
- DDL statements
- Transaction control
- Simple queries where you don't need results

**Use `db.prepare()` for:**
- Executing the same SQL multiple times (prepare once, run many)
- Complex result streaming with `step()`
- When you need fine control over binding/execution

**Use `db.eval()` for:**
- Fetching results with parameters
- Convenient iteration without manual finalization

---

## 5. React Native Compatibility

### Current Status
✅ We have `structuredClone` polyfill in `index.js`
✅ Plugin loader is disabled (not needed for our use case)

### Latest Quereus Guidance (README line 168-183)
```typescript
// Install polyfill
import structuredClone from '@ungap/structured-clone';
if (typeof globalThis.structuredClone === 'undefined') {
  globalThis.structuredClone = structuredClone;
}
```

**⚠️ RECOMMENDATION**: 
- Check if we should use `@ungap/structured-clone` package instead of JSON.parse/stringify
- Our current polyfill works but the suggested package is more robust

---

## Action Items

### ✅ Completed (Dec 2, 2025)
1. ✅ **Simplified database initialization** - removed redundant MemoryTableModule registration and pragmas
2. ✅ **Removed NULL parameter workarounds** - removed string interpolation workarounds in schema.samples.ts
3. ✅ **Replaced prepared statements with `db.exec(sql, params)`** for simple inserts in schema.ts and schema.samples.ts
4. ✅ **Replaced `asyncIterableToArray()` with `Array.fromAsync()`** in schema.ts and logEntries.ts
5. ✅ **Upgraded to `@ungap/structured-clone`** package for more robust polyfill
6. ✅ **Updated logEntries.ts** - replaced all prepared statements with `db.exec()` for inserts/updates/deletes

### Remaining Tasks
7. **Test the changes** - verify NULL handling works correctly with new Quereus
8. **Update `quereus-rn-issues.md`** to reflect what's actually still broken vs fixed
9. **Add comments** explaining why we use certain patterns where helpful

---

## Example Refactoring

### Before (Current Code - schema.ts lines 201-205)
```typescript
const typeStmt = await db.prepare('INSERT INTO types (id, name) VALUES (?, ?)');
for (const type of PRODUCTION_SEEDS.types) {
    await typeStmt.run([type.id, type.name]);
}
await typeStmt.finalize();
```

### After (Using Modern Quereus)
```typescript
for (const type of PRODUCTION_SEEDS.types) {
    await db.exec('INSERT INTO types (id, name) VALUES (?, ?)', [type.id, type.name]);
}
```

### Before (Current Workaround - schema.samples.ts line 113)
```typescript
const maxVal = quant.max_value === null ? 'NULL' : quant.max_value;
await db.exec(`INSERT INTO item_quantifiers (...) VALUES ('${quant.id}', ..., ${maxVal}, ...)`);
```

### After (Test if NULL handling works now)
```typescript
await db.exec(
    'INSERT INTO item_quantifiers (id, item_id, name, min_value, max_value, units) VALUES (?, ?, ?, ?, ?, ?)',
    [quant.id, quant.item_id, quant.name, quant.min_value, quant.max_value, quant.units]
);
```

---

## Notes

- The new Quereus is "strongly typed" - parameters are validated against expected types
- `db.exec()` with parameters is now the recommended simple approach
- Prepared statements still valuable for repeated execution (prepare once, run many times)
- The distinction between `exec`, `eval`, and `prepare` is now clearer and more useful

