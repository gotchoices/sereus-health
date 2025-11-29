# EditEntry Screen Spec

## Purpose
Single-screen form for adding, editing, or cloning log entries. Uses modal pickers for type/category/item selection rather than multi-screen wizard.

## Route
- `EditEntry`
- Params: `mode` (new | edit | clone), `entryId` (for edit/clone)

## Modes

### New Mode
- All fields empty/default
- Type: no selection
- Items: empty
- Quantifiers: none
- Timestamp: current time
- Comment: empty

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
   - Shows: Selected type name OR "Select Type" placeholder
   - Tap → Opens modal with type picker (Activity/Condition/Outcome + user-defined)
   - Single-select
   - After selection, Category selector becomes enabled

2. **Category Selector** (required, disabled until type selected)
   - Shows: Selected category name OR "Select Category" placeholder
   - Tap → Opens modal with categories filtered by type
   - Single-select
   - After selection, Items selector becomes enabled

3. **Items Selector** (optional - can skip for note entries)
   - Shows: Chip list of selected item names + bundles OR "Select Items" placeholder
   - Tap → Opens modal with SelectionList (multi-select)
   - Modal shows items filtered by category + all bundles
   - Filter enabled (story 03: "bac" → bacon)
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
- List: Activity, Condition, Outcome, + user-defined types
- Single-select (radio buttons or tap-to-select)
- On selection → close modal, update main screen

### Category Picker Modal
- Same pattern as Type
- Filtered by selected type
- Header: "Select Category"

### Items Picker Modal
- Full-screen (needs more space for filtering)
- Header: "Select Items" + Done button
- Uses SelectionList component:
  - Filter input at top
  - Multi-select checkboxes
  - Shows items from selected category + all groups
  - Scroll list
- Done button → close modal, update main screen with chips

### Date/Time Picker
- Use native RN DateTimePicker (platform-specific UI)
- Mode: datetime
- Displays in device locale

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

## Open Questions (for later refinement)
- Unsaved changes warning? (if user taps back with edits)
- Toast/snackbar on successful save?
- Inline "Add New Item" link in pickers, or always require Catalog navigation?
- Should quantifier inputs have stepper buttons or just numeric keyboard?
- Maximum number of items selectable in one entry?

---

**Decision Date**: 2025-11-29
**Rationale**: Single screen with modal pickers chosen over multi-screen wizard for speed, overview, and standard mobile form UX. Aligns with story emphasis on efficiency (02-daily: "not be a distraction").

