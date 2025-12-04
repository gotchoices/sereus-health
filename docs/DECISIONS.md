# Sereus Health Design Decisions

This document captures key architectural and design decisions made during development, including the rationale behind them.

## Schema Design Decisions

### Flat Categories (No Hierarchy)
**Decision**: Categories are flat - each belongs to exactly one Type. No parent-child relationships between categories.

**Rationale**:
- Simplifies UI/UX - easier to browse and select
- Avoids deep nesting complexity
- Matches mental model from stories (Activity→Eating, Condition→Stress, Outcome→Pain)
- Can always add hierarchy later if needed

**Alternative considered**: Hierarchical categories where Eating→Breakfast→Items, etc.
**Rejected because**: Stories don't show need for this complexity in MVP

---

### Bundle Expansion at Log Time
**Decision**: When logging a bundle (e.g., "BLT"), immediately expand it to individual items and store the items in `log_entry_items` with a reference to the source bundle.

**Rationale**:
- **Immutable history**: Log entries reflect what was ACTUALLY consumed/done at that moment
- **Bundle changes don't affect past**: If Bob later changes what's in a BLT bundle, his historical logs remain accurate
- **Simpler queries**: Don't need recursive expansion when reading history
- **Quantifiers work cleanly**: Each item can have its own quantifier values

**Alternative considered**: Store bundle reference, expand on query
**Rejected because**: 
- Mutable history (changing bundle definition changes past)
- Complex recursive queries
- Quantifier attachment becomes ambiguous

---

### Single-Type Entries
**Decision**: Each log entry has exactly one `type_id`. All items in the entry must belong to that type's categories.

**Rationale**:
- **Clearer semantics**: An entry is either an Activity, Condition, or Outcome - not mixed
- **Simpler UI**: EditEntry screen shows one type at a time
- **Better for analysis**: Can filter/group by type cleanly
- **Matches story patterns**: Bob logs "breakfast" (Activity) or "headache" (Outcome), not both together

**Alternative considered**: Multi-type entries where one entry could have Activities + Outcomes
**Rejected because**: Stories don't show this pattern; would complicate UI and queries

---

### Note Entries (0 Items + Comment)
**Decision**: Allow log entries with 0 items as long as they have a comment. The `type_id` is still required (e.g., type=Condition for general notes/observations).

**Rationale**:
- **Flexible logging**: User can log "felt stressed today" without creating a specific item
- **Simple schema**: No special "note" type needed - just optional items
- **Consistent validation**: `type_id NOT NULL` always, `items` can be empty array

**Use cases**:
- Welcome message (type=Condition, 0 items, helpful comment)
- General observations ("Felt stressed today")
- Freeform notes between structured entries

---

### No Audit Timestamps
**Decision**: No `created_at` or `updated_at` fields in taxonomy tables (types, categories, items, bundles).

**Rationale**:
- **Functional focus**: These fields don't serve user features in MVP
- **Simpler schema**: Less clutter, clearer intent
- **Log entries have timestamps**: The actual logging has full temporal tracking
- **Can add later**: Easy to add if future features need them

---

### Display Order Only for Bundle Members
**Decision**: Only `bundle_members` table has `display_order`. Other tables use alphabetical or usage-based ordering.

**Rationale**:
- **Bundle semantics matter**: Order matters for "BLT" (bread, lettuce, tomato) vs "TLB"
- **UI burden**: Letting users manage display_order for all items would be tedious
- **Smart defaults work better**: Usage-based ordering for items/categories is more useful than manual ordering

---

## Data Seeding Strategy

### Separate Production vs. Sample Seeds
**Decision**: Production seed data in `src/db/schema.ts` (types, categories, welcome message), rich sample data in `src/db/schema.samples.ts` (items, bundles, log entries).

**Rationale**:
- **Clean production build**: Sample data excluded when `__DEV__ = false`
- **Better screenshots**: Rich sample data makes Appeus scenarios realistic
- **Clear separation**: Production seeds are minimal starter data, samples are for testing
- **Explicit control**: Can easily change what production users see vs. developers

**Evolution**: Originally tried declarative schema `seed` blocks, but moved to SQL INSERTs for:
- Better control over when seeding happens
- Explicit column mapping (self-documenting JSON)
- Transaction management
- Easier to maintain and modify

---

## Quereus Integration Approach

### Feature Flag Strategy
**Decision**: Use `USE_QUEREUS` boolean flag in `src/db/config.ts` to switch between Quereus SQL and Appeus mock data.

**Rationale**:
- **Non-destructive**: Keeps all mock data patterns working
- **Risk mitigation**: Can quickly revert if Quereus has issues
- **Parallel development**: Can work on SQL layer without breaking app
- **Platform flexibility**: Could enable Quereus only on platforms where it works

**Why not Quereus-only**:
- React Native compatibility unclear at start
- Appeus mock system already proven and working
- Stories/scenarios need mock variants anyway

---

### Data Layer Abstraction
**Decision**: All Quereus vs. mock switching happens in `src/data/*` adapters. UI components never know the data source.

**Rationale**:
- **Clean separation**: UI code remains simple and focused
- **Single responsibility**: Data source is an implementation detail
- **Easy testing**: Can test UI with mocks regardless of SQL state
- **Type safety**: TypeScript interfaces ensure consistency across both implementations

**Files**:
- `src/data/logHistory.ts` - Switches between `getLogHistoryMock()` and `getAllLogEntries()`
- `src/data/editEntryStats.ts` - Switches between mock stats JSON and SQL queries

---

## React Native Compatibility Decisions

### structuredClone Polyfill
**Decision**: Simple `JSON.parse(JSON.stringify(obj))` polyfill in `index.js`.

**Rationale**:
- **Sufficient for Quereus's use case**: Only clones SqlValue types (strings, numbers, null) in B-tree nodes
- **No external dependencies**: Keeps bundle size small
- **Wide compatibility**: Works in all JavaScript environments
- **Easy to remove**: Once Quereus adds its own polyfill, delete 8 lines

**Why not a full polyfill library**:
- Quereus only needs to clone simple data structures
- JSON approach handles all SqlValue types correctly
- No Date, RegExp, Map, Set, or circular references in B-tree node data

---

### Metro Bundler Patches
**Decision**: Directly patch `node_modules/@quereus/quereus` files to remove dynamic `import()` statements.

**Rationale**:
- **Only option**: Metro fundamentally doesn't support dynamic imports
- **Low risk**: Plugin loader isn't used (MemoryTable is built-in)
- **Documented**: Full patch details in `docs/quereus-rn-issues.md`
- **Temporary**: Can be removed when Quereus provides RN build

**Files patched**:
- `plugin-loader.js` - Commented out 3 dynamic imports, replaced with throws
- `schema-hasher.js` - Removed `node:crypto` import, use Web Crypto API

**Why not fork Quereus**:
- Patches are minimal and well-documented
- Want to contribute fixes upstream, not maintain fork
- Easier to update when new Quereus version released

---

## Current State (Dec 2024)

### Why Quereus Integration is Paused

**Critical blockers found**:
1. **Transaction data loss** - INSERTs succeed but data disappears after COMMIT
2. **Data structure corruption** - `primaryKeys.add is not a function` errors

**Root cause**: Quereus's MemoryTable MVCC implementation appears incompatible with React Native's Hermes JavaScript engine.

**Decision**: Keep all Quereus code in place, use `USE_QUEREUS = false`, wait for upstream fixes.

**Next steps when Quereus RN support is ready**:
- Follow cleanup checklist in `docs/STATUS.md`
- Remove workarounds (autocommit, direct SQL for NULLs)
- Restore transactions
- Switch to prepared statements everywhere
- Set `USE_QUEREUS = true`
- Full integration testing

---

## Lessons Learned

1. **Start with proven tools**: Appeus mock system was invaluable during Quereus debugging
2. **Feature flags are essential**: `USE_QUEREUS` let us preserve both approaches
3. **Document everything**: `quereus-rn-issues.md` will help the Quereus team fix RN support
4. **Test early on target platform**: Quereus works great in Node/web, very different story in RN
5. **Comprehensive logging**: The logger module was crucial for debugging Quereus issues

