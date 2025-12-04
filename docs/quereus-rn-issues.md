# Quereus React Native Compatibility Issues

This document tracks issues discovered while integrating Quereus into the Sereus Health React Native app.

> **Note**: We are using Quereus from the workspace (`ser/quereus/packages/quereus`), so modifications are made directly to the source TypeScript files, not to compiled `node_modules` files.

## 1. Missing `structuredClone` Global (RESOLVED)

**Issue**: Quereus's B-tree implementation uses `structuredClone()` which is not available in React Native's JavaScript engines (JavaScriptCore/Hermes).

**Location**: Called from `nodes.js:10` → `clone` function during B-tree insert operations.

**Workaround**:
```javascript
// index.js - Add before any imports
if (typeof globalThis.structuredClone === 'undefined') {
  globalThis.structuredClone = function structuredClone(obj) {
    return JSON.parse(JSON.stringify(obj));
  };
}
```

**Recommendation**: Quereus should include a `structuredClone` polyfill or use an alternative cloning method that works in all environments.

---

## 2. Dynamic `import()` Statements Not Supported (RESOLVED)

**Issue**: Metro bundler (React Native's JavaScript bundler) does not support dynamic `import()` statements, which are used in Quereus for plugin loading and Node.js module imports.

**Locations**: 
- `plugin-loader.ts:57` - `import(/* @vite-ignore */ moduleUrl.toString())`
- `schema-hasher.ts:28` - `import('node:crypto')`

**Solution**: Modified Quereus source code in workspace:

### Plugin Loader (`quereus/packages/quereus/src/util/plugin-loader.ts`)
- Commented out dynamic import and plugin registration logic
- Added clear error message explaining RN limitation
- Throws error if plugin loading is attempted in RN environment

```typescript
throw new Error(
  'Dynamic plugin loading is not supported in React Native. ' +
  'Plugins must be statically imported and registered.'
);
```

### Schema Hasher (`schema-hasher.ts`)
- Uses `globalThis.crypto.subtle` (Web Crypto API) instead of Node.js crypto module
- Web Crypto API is available in React Native via polyfills

**Impact**:
- ✅ **Schema hashing**: Works with Web Crypto polyfill
- ❌ **Dynamic plugins**: Not available in React Native
- ✅ **Static plugins**: Can be registered via explicit API calls (if needed)

**Recommendation for Plugin Support in RN**:
If plugins are needed, implement static registration pattern:
```typescript
import myPlugin from './my-plugin';
await db.registerPlugin(myPlugin);
```

**Files Modified**:
- `quereus/packages/quereus/src/util/plugin-loader.ts` (source)
- `quereus/packages/quereus/src/schema/schema-hasher.ts` (source)

**Status**: ✅ Resolved - plugins disabled, schema operations work

---

## 3. Prepared Statement NULL Parameter Type Inference (ACTIVE ISSUE)

**Issue**: When using prepared statements with nullable columns, Quereus incorrectly validates NULL parameters as if the column were NOT NULL.

**Error**:
```
QuereusError: Parameter type mismatch for :N: expected non-nullable [TYPE], got NULL
```

**Examples**:

### Example 1: Real column with NULL
```sql
-- Schema
CREATE TABLE item_quantifiers (
  id TEXT PRIMARY KEY,
  item_id TEXT,
  name TEXT,
  min_value REAL NULL,
  max_value REAL NULL,  -- Explicitly nullable
  units TEXT NULL
);

-- Code
const stmt = await db.prepare(
  'INSERT INTO item_quantifiers (id, item_id, name, min_value, max_value, units) VALUES (?, ?, ?, ?, ?, ?)'
);
await stmt.run([
  'quant-headache-duration',
  'item-headache',
  'Duration',
  0.0,
  null,  // ❌ Fails: "Parameter type mismatch for :5: expected non-nullable INTEGER, got NULL"
  'minutes'
]);
```

### Example 2: Text column with NULL
```sql
-- Schema
CREATE TABLE log_entries (
  id TEXT PRIMARY KEY,
  timestamp TEXT,
  type_id TEXT,
  comment TEXT NULL  -- Explicitly nullable
);

-- Code
const stmt = await db.prepare(
  'INSERT INTO log_entries (id, timestamp, type_id, comment) VALUES (?, ?, ?, ?)'
);
await stmt.run([
  'entry-lunch',
  '2025-11-26T12:15:00Z',
  'type-activity',
  null  // ❌ Fails: "Parameter type mismatch for :4: expected non-nullable TEXT, got NULL"
]);
```

**Current Workaround**: Use direct SQL with string interpolation:
```javascript
const maxVal = quant.max_value === null ? 'NULL' : quant.max_value;
await db.exec(`INSERT INTO item_quantifiers (...) VALUES (..., ${maxVal}, ...)`);
```

**Root Cause**: Appears to be in `validateParameterTypes()` function which doesn't consider the column's nullability when validating parameter types.

**Expected Behavior**: When a column is defined as nullable (`REAL NULL`, `TEXT NULL`, etc.), prepared statements should accept JavaScript `null` values for those parameters.

**Recommendation**: 
1. Fix parameter type validation to check column nullability from schema
2. Add test cases for prepared statements with NULL values in nullable columns
3. Document expected behavior for NULL handling in prepared statements

---

## 4. Transaction Data Loss in React Native (CRITICAL)

**Issue**: Data inserted within explicit transactions (BEGIN/COMMIT) is lost after COMMIT. The INSERT statements execute without errors, COMMIT succeeds, but subsequent SELECT queries return 0 rows.

**Error**: No error thrown, but data silently disappears after transaction commit.

**Example**:
```typescript
const db = await getDatabase();

await db.exec('BEGIN');

// Insert data with prepared statement
const stmt = await db.prepare('INSERT INTO types (id, name) VALUES (?, ?)');
await stmt.run(['type-activity', 'Activity']);
await stmt.run(['type-condition', 'Condition']);
await stmt.run(['type-outcome', 'Outcome']);
await stmt.finalize();

await db.exec('COMMIT');
logger.info('Production seeds applied: 3 types'); // ✓ Logs successfully

// Verify immediately after COMMIT
const verifyStmt = await db.prepare('SELECT * FROM types');
const allTypes = await asyncIterableToArray(verifyStmt.all());
logger.debug(`Found ${allTypes.length} types`); // ❌ Prints: "Found 0 types"
```

**Observed Behavior**:
1. `BEGIN` executes successfully
2. All INSERT statements execute without errors
3. `COMMIT` executes successfully  
4. Immediately after COMMIT, SELECT returns 0 rows
5. Data has completely disappeared

**Root Cause**: Unknown, but appears to be related to how Quereus's MemoryTable handles transaction layers in React Native. Possibly:
- Transaction commits are not actually persisting to the base layer
- There's a layer management issue in RN's JavaScript engine
- MVCC (Multi-Version Concurrency Control) isn't collapsing layers correctly

**Tested Workarounds**:
1. ❌ **Remove explicit transactions (autocommit)** - Same issue persists, data still lost
2. ❌ **Direct SQL instead of prepared statements** - No difference

**Current Status**: No workaround available. This is a fundamental incompatibility.

**Expected Behavior**: After COMMIT (or in autocommit mode), all inserted data should be visible in subsequent queries on the same database connection.

**Reproduction**: See `health/src/db/schema.ts` `applyProductionSeeds()` function.

---

## 5. Internal Data Structure Corruption (CRITICAL)

**Issue**: Quereus's internal data structures are not properly initialized or maintained in React Native, leading to runtime errors when trying to use Set/Map methods.

**Error**:
```
TypeError: existingEntry.primaryKeys.add is not a function (it is undefined)
  at addEntry (transaction.js:...)
  at recordUpsert (transaction.js:...)
```

**Observed Behavior**:
- Occurs during INSERT operations in autocommit mode
- Suggests `primaryKeys` is expected to be a Set but is `undefined` or a plain object
- Error occurs in Quereus's internal transaction/MVCC layer

**Root Cause**: Likely related to how React Native's JavaScript engine (Hermes) handles:
- ES6 data structures (Set, Map) serialization/deserialization  
- Object prototype chains
- Async/await state management in MVCC layers

**Current Status**: No workaround available. This is a fundamental architectural incompatibility.

**Expected Behavior**: Quereus's internal data structures should be properly initialized and maintained throughout the lifecycle of database operations.

**Reproduction**: Insert data in autocommit mode and observe internal errors in Quereus's transaction management layer.

---

## Summary

**Issues #1 and #2** have been successfully resolved with polyfills and patches.

**Issue #3** (NULL validation) has a workable but ugly solution (direct SQL).

**Issues #4 and #5** are **fundamental blockers** that cannot be worked around:
- Data disappears after insertion (both transaction and autocommit modes)
- Internal data structures are corrupted or not properly initialized

These issues suggest **Quereus's in-memory MemoryTable implementation is not compatible with React Native's JavaScript engine (Hermes)**. The problems appear to be in core areas:
- MVCC (Multi-Version Concurrency Control) layer management
- Transaction commit/rollback logic
- ES6 data structure (Set/Map) handling

**Recommendation**: 
1. File comprehensive bug report with Quereus maintainers
2. Consider Quereus RN support as experimental/unsupported
3. Use alternative solutions for React Native:
   - Continue with Appeus mock data system (current approach)
   - Use `react-native-sqlite-storage` or `expo-sqlite` for native SQLite
   - Wait for Quereus team to add official React Native support

---

## Testing Configuration

**Environment**:
- React Native: 0.76.5
- JavaScript Engine: Hermes
- Platform: Android
- Quereus Version: (from package.json)

**Reproduction**:
See `health` project at `health/src/db/schema.samples.ts` for full reproduction case.

