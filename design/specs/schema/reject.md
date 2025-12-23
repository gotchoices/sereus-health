---
id: schema-reject
name: Schema Reject Pile
description: Material removed from the original schema draft for human review before deletion.
---

This file intentionally holds **non-spec** material (rationale dumps, pseudo-code, future ideas, seed SQL, etc.) that was removed while converting the draft into concise schema specs under `specs/schema/`.

If you care about any part of this content, we can promote it back into the appropriate schema doc (or into `design/generated/…`).

## Original draft (verbatim)

Source: previously `design/specs/api/schema.md` (prior to schema re-org).

---

# Database Schema Spec

## Purpose
Outline the schema for Sereus Health's core data model: log entries, taxonomy (types, categories, items, bundles), and quantifiers. This schema will be implemented in Quereus (Sereus SQL layer).

## Design Principles

1. **Single-user database**: All data belongs to Bob (the device owner)
2. **Timestamp normalization**: All times stored as UTC, displayed in device locale
3. **Flat category structure**: Types → Categories → Items (no category hierarchy for MVP)
4. **Quantifiers per item**: Each item defines 0-N quantifiers; quantified only when logged individually
5. **Immutable history**: Bundles expand to items at log time, creating historical snapshot
6. **Bundles for convenience**: Bundles trade detail (quantifiers) for speed; expand at save, not query
7. **Single-type entries**: Each log entry contains items of only one type (Activity OR Condition OR Outcome)
8. **Items optional**: Entries may have 0 items (comment-only entries for notes/observations); type still required
9. **Sereus sync**: All tables distributed across Bob's cadre and guest nodes

## Key Design Decisions

### Decision 1: Flat Categories (No Hierarchy)
**Chosen approach:** Types → Categories → Items (2 levels, no nesting)

**Rationale:**
- Stories show flat lists ("Eating, Exercise, Recreation" - Story 01)
- No story mentions nested categories
- Simpler schema, faster queries
- Can add hierarchy later without breaking data if needed

**Example:**
```
Type: Activity
  Category: Eating
    Items: Omelette, Toast, Pizza, Bacon, Lettuce
    Bundle: BLT (Bacon, Lettuce, Tomato, Bread, Mayo)
  Category: Exercise  
    Items: Jogging, Pushups, Yoga
    Bundle: Upper Body (Pushups, Pullups, Dips)

Type: Condition
  Category: Mental
    Items: Stress, Anxiety
  Category: Weather
    Items: Rainy, Hot, Cold

Type: Outcome
  Category: Pain
    Items: Headache, Joint Pain, Stomach Pain
```

### Decision 2: Expand Bundles at Log Time (Immutable Snapshot)
**Chosen approach:** When Bob logs a bundle, expand it to individual items and store those items.

**Rationale:**
- **Historical accuracy**: "BLT logged Nov 1" always means bacon+lettuce+tomato+bread+mayo, even if Bob later adds avocado to BLT bundle definition
- **Graphing correctness**: "Show avocado consumption over time" only counts dates when Bob actually logged avocado, not retroactively when bundle changed
- **Logs are facts**: Entry records what Bob actually consumed/did/experienced on that date, not current bundle definition

**Example:**
```
Nov 1: Bob logs "BLT"
  → Stores: bacon, lettuce, tomato, bread, mayo (5 items)
  
Nov 15: Bob edits BLT bundle to include avocado
  
Nov 20: Bob logs "BLT" again
  → Stores: bacon, lettuce, tomato, bread, mayo, avocado (6 items)

Graph "avocado consumption":
  → Shows avocado only from Nov 15 forward ✓
  → Does NOT show avocado on Nov 1 (correct - he didn't eat it)
```

**Trade-off:** More storage (5 rows instead of 1), but accurate history.

**Display:** Use `source_bundle_id` to show "BLT" in UI instead of listing all 5 items.

### Decision 3: All Quantifiers Are Optional (User-Controlled Detail)
**Chosen approach:** Quantifiers are properties of item definitions, not of how items are selected.

**Rationale:**
- **Quantifiers defined per item**: When Bob defines an item (Bacon, Jogging, Stress), he decides if it needs quantifiers
- **Same behavior regardless of selection method**: Whether item is logged directly or via bundle expansion, quantifier inputs appear if defined on the item
- **All quantifiers always optional**: Bob can fill, partially fill, or skip all quantifiers at log time
- **User wisdom**: Smart users define quantifiers only on items that matter for health tracking (pain intensity, exercise distance), not on every food

**Example:**

**Wise user (selective quantifiers):**
```
Bob defines items:
  - Jogging: Distance (miles), Duration (minutes) ← quantifiers matter
  - Stress: Intensity (1-10) ← quantifier matters
  - Bacon: (no quantifiers) ← doesn't track bacon quantity
  - Lettuce: (no quantifiers)

Bob logs "BLT + Milk":
  - BLT → expands to Bacon, Lettuce, Tomato, Bread, Mayo
  - None have quantifiers defined
  - Milk: Amount (glasses) ← shows quantifier input
  
UI shows:
  [x] BLT
  [x] Milk
      Amount: [1] glasses
  
Result: Fast entry, focused detail ✓
```

**Over-quantifier user (quantifies everything):**
```
Bob defines items:
  - Bacon: Amount (slices), Weight (oz), Fat (g)
  - Lettuce: Weight (oz), Leaves (count)
  - Tomato: Weight (oz), Slices (count)
  - Bread: Slices (count)
  - Mayo: Amount (tbsp)
  - Milk: Amount (glasses)

Bob logs "BLT + Milk":
  - BLT → expands to 5 items
  - Each has quantifiers defined
  
UI shows:
  [x] BLT
      Bacon
        Amount: [__] slices
        Weight: [__] oz
        Fat: [__] g
      Lettuce
        Weight: [__] oz
        Leaves: [__] count
      ... (10+ more inputs)
  [x] Milk
      Amount: [__] glasses

Result: Slow entry, maximum detail
User chose to define all those quantifiers → accepts consequence ✓
```

**Key insight:** Quantifier verbosity is a character of how Bob **defines** items, not how he **logs** them. Bundles don't hide quantifiers—they simply expand to their member items, each showing its own defined quantifiers.

### Decision 4: Single-Type Entries
**Chosen approach:** Each log entry contains items of only one type.

**Rationale:**
- **Story evidence**: EditEntry flow starts with "Choose type" (Activity/Condition/Outcome), then selects items within that type
- **No mixed-type stories**: No story shows Bob logging "breakfast + headache" as single entry
- **Clear semantics**: Entry is either "things I did" OR "conditions I experienced" OR "outcomes I felt"
- **Performance**: `log_entries.type_id` enables fast filtering without joins

**Validation:** Database trigger ensures all items in `log_entry_items` share the same type (via items → categories → type_id).

## Schema Overview

### Core Tables
1. `types` - Top-level types (Activity, Condition, Outcome, custom)
2. `categories` - Flat categories under types (no hierarchy in MVP)
3. `items` - Loggable items belonging to categories
4. `item_quantifiers` - Quantifier definitions attached to items
5. `bundles` - Named collections of items (and nested bundles)
6. `bundle_members` - Many-to-many: bundles ↔ items/bundles
7. `log_entries` - Individual log records (one type per entry)
8. `log_entry_items` - Items in entries (bundles expanded at log time)
9. `log_entry_quantifier_values` - Recorded quantifier values

---

## Table Definitions

### `types`
Top-level classification for log entries (Activity, Condition, Outcome, user-defined).

**Columns:**
- `id` (UUID, PK)
- `name` (TEXT, NOT NULL, UNIQUE)
  - Examples: "Activity", "Condition", "Outcome", "Medication"
- `color` (TEXT, NULL)
  - Hex color for UI display (e.g., '#3B82F6')
  - If null, use default/fallback color
- `display_order` (INTEGER, NOT NULL, default 0)
  - Controls ordering in type selectors
  - Lower numbers appear first

**Constraints:**
- Primary key: `id`
- Unique: `name`

**Notes:**
- Story 02:11 says types are editable by user
- Initial seed: Activity, Condition, Outcome (with distinct colors)
- UI ordering: By `display_order` ascending, then alphabetical by name
- Updates trigger taxonomy lifecycle logic (general.md)
- Users can create custom types (e.g., "Medication", "Supplements", "Social")

---

### `categories`
Flat categories organized under types (e.g., Activity → Eating, Exercise). No hierarchy in MVP.

**Columns:**
- `id` (UUID, PK)
- `type_id` (UUID, FK → types.id, NOT NULL)
- `name` (TEXT, NOT NULL)

**Constraints:**
- Primary key: `id`
- Foreign key: `type_id` references `types(id)` ON DELETE RESTRICT
- Unique: `(type_id, name)` - no duplicate category names within a type

**Notes:**
- Story 01:13: "Eating, Exercising, Recreation, Work" under Activity type (all peers, no nesting)
- Story 02:13: "Health, Welfare, Pain" under Outcome type (flat list)
- Story 02:25: "Weather, Stress, Environment" under Condition type
- No `parent_category_id` for MVP (flat structure); can add later if needed
- **UI ordering**: Alphabetical by name (predictable, no management burden)
  - Alternative: Usage-based (most logged categories first) - future enhancement
- Deletion restricted if referenced by items or log entries

**Migration path:** If hierarchy needed later, add `parent_category_id UUID REFERENCES categories(id)` column.

---

### `items`
Individual loggable items (foods, exercises, symptoms, etc.).

**Columns:**
- `id` (UUID, PK)
- `category_id` (UUID, FK → categories.id, NOT NULL)
- `name` (TEXT, NOT NULL)
- `description` (TEXT, NULL)
  - Optional user notes

**Constraints:**
- Primary key: `id`
- Foreign key: `category_id` references `categories(id)` ON DELETE RESTRICT
- Unique: `(category_id, name)` - no duplicate item names within category

**Notes:**
- Story 01:16: "omelette, toast, orange juice" as items
- Story 01:26: "Pushups, pullups, situps, jogging"
- Story 02:15: "stomach pain"
- Each item belongs to exactly one category (general.md)
- **UI ordering**: Alphabetical by name + filter/search (Story 03:17: "bac" → bacon)
  - Story 03 emphasizes filter over scrolling long lists
  - Alternative: Recently used / most frequent first - future enhancement
- Deletion restricted if referenced by bundles or log entries

---

### `item_quantifiers`
Quantifier definitions attached to specific items (e.g., headache has "Intensity" and "Duration").

**Columns:**
- `id` (UUID, PK)
- `item_id` (UUID, FK → items.id, NOT NULL)
- `name` (TEXT, NOT NULL)
  - Examples: "Intensity", "Duration", "Distance", "Reps", "Amount"
- `data_type` (TEXT, NOT NULL, default 'numeric')
  - For MVP: always 'numeric'
  - Future: could support 'text', 'boolean', 'duration'
- `min_value` (REAL, NULL)
  - Optional minimum (e.g., 1 for 1-10 scale)
- `max_value` (REAL, NULL)
  - Optional maximum (e.g., 10 for 1-10 scale)
- `units` (TEXT, NULL)
  - Display string: "1-10", "reps", "minutes", "miles", "glasses"

**Constraints:**
- Primary key: `id`
- Foreign key: `item_id` references `items(id)` ON DELETE CASCADE
- Unique: `(item_id, name)` - no duplicate quantifier names per item
- Check: `min_value <= max_value` (if both present)

**Notes:**
- Story 02:16-17: Bob adds "Intensity" quantifier (1-10 scale) to "stomach pain" item
- Story 01:27: Jogging has "Distance" (2 miles) and "Duration" (30 minutes)
- general.md: Quantifiers are defined per item, 0-N per item
- **UI ordering**: Definition order (first quantifier defined appears first in UI)
  - Items typically have 1-3 quantifiers, so order not critical
  - Alternative: Alphabetical by name
- Deleting item cascades to delete its quantifiers (can't orphan quantifier definitions)

---

### `bundles`
Named collections of items and/or other bundles (e.g., "BLT", "Breakfast", "Upper Body Workout").

**Columns:**
- `id` (UUID, PK)
- `type_id` (UUID, FK → types.id, NOT NULL)
  - **Type affinity**: All members must belong to this type
  - Examples: "BLT" is Activity, "Migraine Symptoms" is Outcome, "Stressful Day" is Condition
- `name` (TEXT, NOT NULL)
- `description` (TEXT, NULL)

**Constraints:**
- Primary key: `id`
- Foreign key: `type_id` references `types(id)` ON DELETE RESTRICT
- Unique: `(type_id, name)` - bundle names unique within a type

**Validation (via trigger or application logic):**
```sql
-- Ensure all items in bundle_members share bundle's type_id
-- Check on INSERT/UPDATE of bundle_members:
--   item.category.type_id == bundle.type_id (for item members)
--   nested_bundle.type_id == bundle.type_id (for bundle members)
```

**Notes:**
- Story 03:15: "BLT" bundle containing bacon, lettuce, tomato, bread, mayo (all Activity/Eating)
- Bundles are type-specific: cannot mix Activity items with Outcome items
- Bundle nesting allowed (general.md): a bundle can contain other bundles of the same type
- Enables filtering bundles by type in Catalog UI
- Deletion should check if bundle is referenced by log entries or parent bundles

---

### `bundle_members`
Many-to-many relationship: bundles can contain items and/or other bundles.

**Columns:**
- `id` (UUID, PK)
- `bundle_id` (UUID, FK → bundles.id, NOT NULL)
- `member_item_id` (UUID, FK → items.id, NULL)
  - If this bundle member is an item
- `member_bundle_id` (UUID, FK → bundles.id, NULL)
  - If this bundle member is another bundle (nested)
- `display_order` (INTEGER, default 0)
  - **Functional purpose**: Bundle members have semantic order (BLT = Bacon-Lettuce-Tomato, not alphabetical)
  - UI: Drag-to-reorder when composing bundle
  - Reasonable burden: infrequent (bundle creation), small lists (5-10 items)

**Constraints:**
- Primary key: `id`
- Foreign key: `bundle_id` references `bundles(id)` ON DELETE CASCADE
- Foreign key: `member_item_id` references `items(id)` ON DELETE CASCADE
- Foreign key: `member_bundle_id` references `bundles(id)` ON DELETE CASCADE
- Check: `(member_item_id IS NOT NULL AND member_bundle_id IS NULL) OR (member_item_id IS NULL AND member_bundle_id IS NOT NULL)`
  - Exactly one of item or bundle must be set
- Unique: `(bundle_id, member_item_id)` where `member_item_id IS NOT NULL`
- Unique: `(bundle_id, member_bundle_id)` where `member_bundle_id IS NOT NULL`
- Check: `member_bundle_id != bundle_id` (prevent self-reference)

**Notes:**
- Allows both items and bundles as members
- Cascades: deleting bundle removes memberships; deleting item/bundle removes it from all bundles
- Should detect/prevent circular nesting at application level (A contains B contains A)

---

### `log_entries`
Individual log records created by Bob. Each entry contains items of only ONE type.

**Columns:**
- `id` (UUID, PK)
- `type_id` (UUID, FK → types.id, NOT NULL)
  - Denormalized for performance (fast filtering by type)
  - **Validated**: All items in this entry must share this type
- `timestamp` (TIMESTAMP, NOT NULL)
  - UTC normalized, user editable
  - Story 01:18: "sets that back to 8am"
  - Story 05:13: Clone sets to current time
  - **Functional purpose**: Log when event occurred, sort chronologically, filter by date range
- `comment` (TEXT, NULL)
  - Free-form note
  - Story 02:28: "notes the reason for the stress"

**Constraints:**
- Primary key: `id`
- Foreign key: `type_id` references `types(id)` ON DELETE RESTRICT
- Index: `timestamp` (for chronological queries)
- Index: `type_id` (for filtering by type)

**Validation (via trigger or application logic):**
```sql
-- Ensure all items in log_entry_items share entry's type_id
-- Check on INSERT/UPDATE of log_entry_items:
--   item.category.type_id == log_entry.type_id
```

**Notes:**
- Story 01:9: Welcome message is an entry with 0 items, just comment (e.g., type=Condition, items=[], comment="Welcome...")
- Story 01:19: "now he can see his new item in the list"
- Story 02:21: "commits the item"
- EditEntry flow: user chooses type first, then selects items (optional - can skip for comment-only entries)
- **Items optional**: Entries with 0 items valid for notes/observations (comment typically present)
- Deletion allowed (Bob can delete log entries)
- Editing entries: update timestamp, comment, or linked items/quantifiers

---

### `log_entry_items`
Items logged in entries. **Bundles are expanded to items at log time** (immutable snapshot).

**Columns:**
- `id` (UUID, PK)
- `log_entry_id` (UUID, FK → log_entries.id, NOT NULL)
- `item_id` (UUID, FK → items.id, NOT NULL)
  - **Always an item**, never a bundle reference
  - Bundles are expanded at save time
- `source_bundle_id` (UUID, FK → bundles.id, NULL)
  - **Optional**: If this item came from expanding a bundle, record which bundle
  - **Functional purpose**: Display "BLT" instead of listing all 5 items; preserve semantic meaning
  - NULL if item was selected individually (not from bundle)

**Constraints:**
- Primary key: `id`
- Foreign key: `log_entry_id` references `log_entries(id)` ON DELETE CASCADE
- Foreign key: `item_id` references `items(id)` ON DELETE RESTRICT
- Foreign key: `source_bundle_id` references `bundles(id)` ON DELETE SET NULL
  - If bundle deleted, items remain but lose bundle association
- Unique: `(log_entry_id, item_id)` - can't log same item twice in one entry
- Index: `source_bundle_id` (for grouping in display)

**Bundle Expansion Logic (application layer):**
```typescript
// When Bob selects "BLT" bundle in EditEntry:
const bundle = await getBundle('BLT');
const members = await getBundleMembers(bundle.id); // returns: bacon, lettuce, tomato, bread, mayo

// At save time, insert 5 rows:
for (const member of members) {
  await db.insert('log_entry_items', {
    log_entry_id: entryId,
    item_id: member.id,
    source_bundle_id: bundle.id  // remember it came from BLT
  });
}

// Later, when displaying entry:
const items = await getLogEntryItems(entryId);
const grouped = groupBy(items, 'source_bundle_id');
// Display: "BLT • Milk" instead of "Bacon • Lettuce • Tomato • Bread • Mayo • Milk"
```

**Notes:**
- Story 01:17: "select omelette, toast and orange juice" - 3 items, no group
- Story 03:19: "selects BLT and milk" - BLT expands to 5 items, milk is 1 item = 6 rows total
- **Historical accuracy**: If Bob edits BLT bundle later, past entries unchanged
- **No bundle_id column**: Bundles never stored as references, always expanded
- Deletion behavior:
  - Deleting entry cascades to remove item links
  - Deleting item RESTRICTS (can't delete if logged; use taxonomy lifecycle)
  - Deleting bundle sets `source_bundle_id` to NULL (items remain, lose grouping label)

---

### `log_entry_quantifier_values`
Recorded quantifier values for items. Applies to **any item with quantifiers defined**, regardless of selection method.

**Columns:**
- `id` (UUID, PK)
- `log_entry_id` (UUID, FK → log_entries.id, NOT NULL)
- `item_id` (UUID, FK → items.id, NOT NULL)
  - Which item this quantifier applies to
- `item_quantifier_id` (UUID, FK → item_quantifiers.id, NOT NULL)
  - Which quantifier definition
- `value` (REAL, NOT NULL)
  - Numeric value
  - **Functional purpose**: Record measured/observed value for graphing and analysis

**Constraints:**
- Primary key: `id`
- Foreign key: `log_entry_id` references `log_entries(id)` ON DELETE CASCADE
- Foreign key: `item_id` references `items(id)` ON DELETE RESTRICT
- Foreign key: `item_quantifier_id` references `item_quantifiers(id)` ON DELETE RESTRICT
- Unique: `(log_entry_id, item_id, item_quantifier_id)` - one value per quantifier per item per entry
- Check: foreign key constraint that `item_quantifier_id` must belong to `item_id`:
  ```sql
  -- Enforced via application logic or trigger:
  -- item_quantifiers.item_id (for item_quantifier_id) == item_id
  ```

**Quantifier Behavior with Bundles:**
```typescript
// Scenario 1: Wise user (no quantifiers on food items)
// Bob defines: Bacon (no quantifiers), Lettuce (no quantifiers), etc.
// Bob logs "BLT" group:
//   → Expands to 5 items (bacon, lettuce, tomato, bread, mayo)
//   → None have quantifiers defined
//   → UI shows: [x] BLT (no inputs)
//   → Result: 5 items in log_entry_items, 0 rows in log_entry_quantifier_values
//
// Scenario 2: Over-quantifier user (quantifiers on all foods)
// Bob defines: Bacon (Amount, Weight), Lettuce (Weight), etc.
// Bob logs "BLT" group:
//   → Expands to 5 items
//   → Some/all have quantifiers defined
//   → UI shows: 
//       [x] BLT
//           Bacon: Amount [__], Weight [__]
//           Lettuce: Weight [__]
//           ...
//   → Bob can fill or skip (all optional)
//   → Result: 5 items in log_entry_items, N rows in log_entry_quantifier_values (for filled inputs)
//
// Scenario 3: Mixed (quantifiers on some items)
// Bob defines: Bacon (no quantifiers), Milk (Amount)
// Bob logs "BLT + Milk":
//   → BLT expands to 5 items (no quantifiers)
//   → Milk has quantifier (Amount)
//   → UI shows:
//       [x] BLT
//       [x] Milk
//           Amount: [1] glasses
//   → Result: 6 items in log_entry_items, 1 row in log_entry_quantifier_values
```

**Notes:**
- Story 01:27: Jogging has "Distance: 2 miles" and "Duration: 30 minutes"
- Story 02:20: "selects a 7 for intensity" (stomach pain item)
- Story 03:19: "selects BLT and milk" - whether quantifiers appear depends on item definitions, not selection method
- Quantifiers are **always optional**: item can be logged without filling quantifier values (NULL rows not inserted)
- User controls detail level by choosing which items deserve quantifier definitions (exercise, pain) vs which don't (casual foods)
- Deleting entry cascades; deleting item/quantifier restricts (taxonomy lifecycle)
- For range validation (min/max), check against `item_quantifiers.min_value/max_value` at app level

---

## Indexes

### Performance Optimization
```
log_entries:
  - PRIMARY KEY (id)
  - INDEX (timestamp DESC) - chronological queries
  - INDEX (type_id) - filter by type

log_entry_items:
  - INDEX (log_entry_id) - lookup items for entry
  - INDEX (item_id) - find entries containing item
  - INDEX (source_bundle_id) - group items by bundle for display

log_entry_quantifier_values:
  - INDEX (log_entry_id) - lookup quantifiers for entry
  - INDEX (item_id) - find all values for item (graphing)
  - INDEX (item_quantifier_id) - find all values for quantifier (graphing)

categories:
  - INDEX (type_id) - filter categories by type
  - INDEX (parent_category_id) - hierarchy traversal

items:
  - INDEX (category_id) - filter items by category

item_quantifiers:
  - INDEX (item_id) - lookup quantifiers for item

bundles:
  - INDEX (type_id) - filter bundles by type

bundle_members:
  - INDEX (bundle_id) - expand bundle membership
  - INDEX (member_item_id) - find bundles containing item
  - INDEX (member_bundle_id) - find bundles containing bundle
```

---

## Deletion & Referential Integrity

### Cascade Deletes (data follows parent)
- `log_entries` deleted → cascades to `log_entry_items`, `log_entry_quantifier_values`
- `bundles` deleted → cascades to `bundle_members`
- `items` deleted → cascades to `item_quantifiers`, `bundle_members`

### Restricted Deletes (taxonomy lifecycle)
- Can't delete `types` if referenced by `categories` or `log_entries`
- Can't delete `categories` if referenced by `items`
- Can't delete `items` if referenced by `log_entry_items` (use soft delete or taxonomy lifecycle)
- Can't delete `bundles` if referenced by `log_entry_items` or `bundle_members` (as parent)
- Can't delete `item_quantifiers` if referenced by `log_entry_quantifier_values`

### Taxonomy Lifecycle (general.md)
When Bob edits/deletes taxonomy in use:
- **Editing**: Prompt "update all entries" vs "create new definition for future only"
  - "All": Update in place (no new record)
  - "Future only": Create new record, old entries keep old reference
- **Deleting**: Prompt "hide from UI" vs "delete if not in use"
  - If in use: Soft delete (mark `deleted_at`, hide from pickers)
  - If not in use: Hard delete (CASCADE where appropriate)

---

## Migration Strategy

### Initial Seed Data
```sql
-- Seed types (order handled in UI, not DB)
INSERT INTO types (id, name) VALUES
  (uuid(), 'Activity'),
  (uuid(), 'Condition'),
  (uuid(), 'Outcome');

-- Seed top-level categories (examples from stories, will display alphabetically)
INSERT INTO categories (id, type_id, name) VALUES
  (uuid(), (SELECT id FROM types WHERE name='Activity'), 'Eating'),
  (uuid(), (SELECT id FROM types WHERE name='Activity'), 'Exercise'),
  (uuid(), (SELECT id FROM types WHERE name='Condition'), 'Weather'),
  (uuid(), (SELECT id FROM types WHERE name='Outcome'), 'Pain');

-- Seed example items (from stories)
INSERT INTO items (id, category_id, name) VALUES
  (uuid(), (SELECT id FROM categories WHERE name='Eating'), 'Pizza'),
  (uuid(), (SELECT id FROM categories WHERE name='Eating'), 'Lettuce'),
  (uuid(), (SELECT id FROM categories WHERE name='Exercise'), 'Pushups'),
  (uuid(), (SELECT id FROM categories WHERE name='Pain'), 'Headache');
```

### Version Management
- Use Quereus migration system
- Track schema version in metadata table
- Incremental migrations for schema evolution

---

## Future Considerations

### Soft Deletes
Add `deleted_at` (TIMESTAMP, NULL) to taxonomy tables:
- `types.deleted_at`
- `categories.deleted_at`
- `items.deleted_at`
- `bundles.deleted_at`
- `item_quantifiers.deleted_at`

Filter deleted items from pickers: `WHERE deleted_at IS NULL`

### Versioning / History
For "future only" taxonomy changes, track versions:
- `items.version` (INTEGER, default 1)
- `items.superseded_by_id` (UUID, FK → items.id, NULL)
- Query: `WHERE superseded_by_id IS NULL` for current items

### Permissions (Sereus)
Quereus may support row-level or table-level ACLs:
- Bob (owner): full read/write
- Guest nodes: read-only (default per general.md)
- Future: fine-grained (e.g., guest can read entries but not taxonomy)

### Full-Text Search
Add GIN/trgm indexes for:
- `items.name`, `items.description`
- `log_entries.comment`

---

**Status**: Draft schema for review  
**Last Updated**: 2025-11-29  
**Next Steps**: Review constraints, implement in Quereus, create migration scripts


