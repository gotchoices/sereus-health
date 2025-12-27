# EditEntry Screen Spec

## Purpose
Single-screen form for adding, editing, or cloning log entries. Uses modal pickers for type/category/item selection rather than multi-screen wizard. **Smart defaults and usage-based ordering for efficiency.**

## Route
- `EditEntry`
- Params: `mode` (new | edit | clone), `entryId` (for edit/clone)

## Modes

### New Mode
- **Type**: Auto-selected to most frequently used type in dataset (default: Activity if no data)
- **Category**: Auto-selected to most frequently used category within selected type (or first if no data)
- **Items**: Empty (optional for note entries)
- **Quantifiers**: None
- **Timestamp**: Current time (editable)
- **Comment**: Empty (optional, but typical for note entries)

### Edit Mode
- Load entry by `entryId`
- All fields pre-populated from existing entry
- Timestamp: original entry time (editable)
- Title: "Edit Entry"

### Clone Mode
- Load entry by `entryId`
- Copy all fields: type, items, bundles, quantifiers, comment
- Timestamp: **current time** (not copied)
- Title: "Clone Entry"
- User can adjust any field before committing

## Layout

### Header
- Back button (← or "Cancel")
- Title: "New Entry" | "Edit Entry" | "Clone Entry"
- Delete button (trash icon, edit mode only)

### Form Fields (single scrollable screen)

1. **Type Selector** (required)
   - **Default (new mode)**: Most frequently used type in dataset (fallback: Activity)
   - Shows: Selected type name OR "Select Type" placeholder
   - Tap → Opens modal with type picker (Activity/Condition/Outcome + user-defined)
   - Single-select
   - After selection, Category selector updates to most common category for that type

2. **Category Selector** (required, disabled until type selected)
   - **Default (new mode)**: Most frequently used category within selected type
   - Shows: Selected category name OR "Select Category" placeholder (grayed if disabled)
   - Tap → Opens modal with categories filtered by type
   - **Modal includes**: Search filter at top (story 03: "bac" → bacon pattern)
   - **Ordering**: Categories sorted by usage frequency (most used first)
   - Single-select
   - After selection, Items selector becomes enabled

3. **Items Selector** (optional - can skip for note entries)
   - Shows: Chip list of selected item names + bundles OR "Select Items" placeholder
   - Tap → Opens modal with SelectionList (multi-select)
   - **Modal includes**: 
     - Search/filter input at top (story 03:9 - "bac" → bacon)
     - Multi-select checkboxes
     - Items from selected category + all bundles (bundles marked with icon/badge)
     - **Ordering**: Items sorted by usage frequency (most logged items first)
     - **Bundle preview**: Shows member items "(BLT: bacon, lettuce, tomato, ...)"
   - Can select multiple items and/or bundles
   - Can skip entirely for comment-only note entries

4. **Quantifiers Section** (conditional, shows if any selected item has quantifiers defined)
   - For each selected item that has quantifiers:
     - Item name (subheading)
     - For each quantifier defined on that item:
       - Label: quantifier name + units (e.g., "Intensity (1-10)")
       - Input: Numeric input with min/max validation
       - Optional: stepper buttons +/-
   - Collapsible if many quantifiers?

5. **Timestamp Selector**
   - Shows: Formatted date/time (device locale)
   - Tap → Opens native date/time picker
   - Defaults: current time (new/clone), original time (edit)

6. **Comment Input** (optional)
   - Multi-line text input
   - Placeholder: "Add a note (optional)..."
   - No length limit (or reasonable limit like 1000 chars)

### Footer
- **Save/Commit Button**: Primary action
  - Label: "Save" (edit), "Add Entry" (new), "Clone Entry" (clone)
  - Disabled if required fields missing (type, category, items)
  - On success → navigate back to LogHistory
- **Cancel**: Secondary (or just use header back)

## Modal Picker Pattern

### Type Picker Modal
- Full-screen or bottom sheet
- Header: "Select Type" + Close button (×)
- **Search Filter**: Text input at top of list
- **List**: Activity, Condition, Outcome, + user-defined types
- **Ordering**: Types sorted by usage frequency (most logged type first)
- Single-select (radio buttons or tap-to-select)
- On selection → close modal, update main screen, reset category to most common for new type

### Category Picker Modal
- Same pattern as Type
- Header: "Select Category" + Close button (×)
- **Search Filter**: Text input at top of list
- **Filtered by selected type**: Only shows categories for current type
- **Ordering**: Categories sorted by usage frequency within selected type
- Single-select
- On selection → close modal, update main screen

### Items Picker Modal
- Full-screen (needs more space for filtering)
- Header: "Select Items" + Done button
- Uses SelectionList component:
  - **Search Filter**: Text input at top (story 03:9 - "bac" → bacon)
  - Multi-select checkboxes
  - Items from selected category + all bundles (bundles marked with icon/badge)
  - **Ordering**: Items sorted by usage frequency (most logged first)
  - **Bundle preview**: Shows member items "(BLT: bacon, lettuce, tomato, ...)"
  - Scroll list
- Done button → close modal, update main screen with chips

### Date/Time Picker
- Use native RN DateTimePicker (platform-specific UI)
- Mode: datetime
- Displays in device locale

## Smart Defaults & Ordering

### Usage Frequency API Requirements

To support smart defaults and usage-based ordering, the following API calls are needed:

1. **`getTypeStats()`** → `Array<{id, name, usageCount}>`
   - Returns all types with usage counts from log history
   - Used to: Auto-select most common type, order type picker
   - Mock: Return Activity=100, Condition=50, Outcome=30

2. **`getCategoryStats(typeId)`** → `Array<{id, name, usageCount}>`
   - Returns categories for given type with usage counts
   - Used to: Auto-select most common category, order category picker
   - Mock: Return usage counts per category (e.g., Eating=80, Exercise=40)

3. **`getItemStats(categoryId)`** → `Array<{id, name, usageCount, isBundle}>`
   - Returns items for given category with usage counts
   - Includes both individual items and bundles
   - Used to: Order items picker by frequency
   - Mock: Return usage counts per item (e.g., Omelette=50, BLT=30, Toast=25)

### Default Selection Logic

**New Mode Only** (edit/clone use existing entry data):

1. **On screen load**:
   - Call `getTypeStats()`
   - Auto-select type with highest `usageCount` (or first if tie)
   - If no types exist, default to Activity

2. **On type selection/default**:
   - Call `getCategoryStats(selectedType.id)`
   - Auto-select category with highest `usageCount` (or first if tie)
   - If no categories exist, leave empty

3. **Items remain empty** (user must explicitly select)

### Search Filter Behavior

- **Live filtering**: Updates list as user types
- **Case-insensitive**: "bac" matches "Bacon", "BACON", "bacon"
- **Substring match**: "bac" matches "bacon", "tobacco"
- **Searches**: Item/category/type names only (not descriptions)
- **Empty state**: Shows "No results found" if filter excludes all items

### Ordering Priority

Within each picker modal:
1. **Primary sort**: Usage count (descending - most used first)
2. **Secondary sort**: Alphabetical (for items with equal usage)

## Validation

### On Save
- **Required**: type, timestamp
- **Items**: Optional (can be 0 for note entries); if items selected, category is required
- **Quantifiers**: If item has quantifiers defined, values are optional (can log item without quantifying)
- **Comment**: Optional (but typically present for note entries with 0 items)

### Error Display
- Show error banner at top if validation fails
- Highlight missing required fields in red

## Behavior Notes

### Adding New Items/Categories (story 01, 02)
- If Bob wants to add a new item/category while in EditEntry:
  - **Out of scope for EditEntry screen**
  - Bob must cancel EditEntry → go to Catalog → add item → return and start EditEntry again
  - OR (future): "Add New Item" link in Items Picker modal that navigates to Catalog with deep link back

### Bundles (story 03)
- Bundles appear in Items Picker alongside individual items
- **Visually distinguished**: Icon/badge to indicate bundle (e.g., 📦 or "Bundle" label)
- Selecting a bundle expands to all items in that bundle at save time (immutable snapshot)
- Bundle contents shown as "(BLT: bacon, lettuce, tomato, ...)" or similar in modal
- Quantifier inputs shown for bundle members if defined on those items (all optional)

### Quantifier Display
- If item has 0 quantifiers → no quantifier section shown for that item
- If item has 2+ quantifiers (story 02: headache intensity + duration) → both shown in sequence
- Quantifier inputs only for selected items, not all possible items

## Navigation

### Entry Points
- From LogHistory:
  - Add button → EditEntry (mode=new)
  - Clone icon on entry → EditEntry (mode=clone, entryId=X)
  - Tap entry card → EditEntry (mode=edit, entryId=X)

### Exit Points
- Save → back to LogHistory (with success toast?)
- Cancel/Back → back to LogHistory (confirm if unsaved changes?)
- Delete (edit mode only) → confirm dialog → delete → back to LogHistory

## Theming & i18n
- Uses `useTheme()` for colors
- Uses `useT()` for all strings
- Modal pickers follow same theme
- All inputs use semantic colors (border, text, placeholders)

## Data Requirements (API/Engine Stubs)

### Read Operations
- `getTypeStats()` → Array<{id, name, usageCount}>
- `getCategoryStats(typeId)` → Array<{id, name, usageCount}>
- `getItemStats(categoryId)` → Array<{id, name, usageCount, isBundle}>
- `getLogEntry(entryId)` → LogEntry (for edit/clone modes)

### Write Operations
- `createLogEntry(data)` → {success, entryId}
- `updateLogEntry(entryId, data)` → {success}
- `deleteLogEntry(entryId)` → {success}

### Mock Variants
- **happy**: Typical stats with realistic usage counts (Activity most common, Eating most common within Activity)
- **empty**: No usage data (all counts = 0, defaults to first alphabetically)
- **bundle**: Include bundles in item stats with usage counts
- **balanced**: Equal usage across all types/categories (test tie-breaking)

## Open Questions (for later refinement)
- Unsaved changes warning? (if user taps back with edits)
- Toast/snackbar on successful save?
- Inline "Add New Item" link in pickers, or always require Catalog navigation?
- Should quantifier inputs have stepper buttons or just numeric keyboard?
- Maximum number of items selectable in one entry?
- Show usage count in picker UI (e.g., "Omelette (50)" or just order)?

---

**Decision Date**: 2025-11-29
**Updated**: 2025-11-29 (added smart defaults, search filters, usage-based ordering)
**Rationale**: 
- Single screen with modal pickers chosen over multi-screen wizard for speed, overview, and standard mobile form UX. Aligns with story emphasis on efficiency (02-daily: "not be a distraction").
- Smart defaults reduce taps for common entries (most users log similar activities repeatedly).
- Usage-based ordering surfaces frequently logged items first (faster selection, fewer scrolls).
- Search filters essential for large catalogs (story 03: "bac" → bacon pattern).

