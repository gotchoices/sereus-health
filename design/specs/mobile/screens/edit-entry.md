# EditEntry Screen Spec

## Purpose
Single-screen form for creating, editing, or cloning log entries, optimized for fast daily use.

## Route
- `EditEntry`
- Params: `mode` (new | edit | clone), `entryId` (for edit/clone)

## Modes

### New Mode
- **Type**: defaults to the last-selected Type (if one has ever been selected); otherwise user selects
- **Category**: defaults to the last-selected Category **within the currently selected Type** (if any); otherwise user selects or leaves empty
- **Items/Bundles**: empty; user must select (no default)
- **Quantifiers**: shown only for selected items that define them; values optional
- **Timestamp**: defaults to current time (editable)
- **Comment**: optional

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
- Delete button (trash icon, edit mode only; confirm required)

### Form Fields (single scrollable screen)

1. **Type Selector** (required)
   - Shows: Selected type name OR "Select Type" placeholder
   - Tap → Opens modal with type picker
   - Single-select
   - Type applies to the whole entry (single-type rule)

2. **Category Selector** (optional, disabled until type selected)
   - Shows: Selected category name OR "Select Category" placeholder (grayed if disabled)
   - Tap → Opens modal with categories filtered by type
   - Modal supports search/filter (see `design/specs/mobile/global/general.md`)
   - Single-select
   - Used to narrow item selection; not required to save an entry

3. **Items/Bundles Selector** (optional)
   - Shows: Chip list of selected item names + bundles OR "Select Items" placeholder
   - Tap → Opens modal with SelectionList (multi-select)
   - **Modal includes**: 
     - Search/filter input (see `design/specs/mobile/global/general.md`)
     - Multi-select checkboxes
     - Items (optionally filtered by selected Category) + Bundles (visually distinguished)
   - Can select multiple items and/or bundles

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
  - Disabled if required fields missing (Type, Timestamp, Items/Bundles)
  - On success → navigate back to LogHistory
- **Cancel**: Secondary (or just use header back)

## Picker behavior (high-level)

Shared rules for the Type, Category, and Items/Bundles pickers:

- **Header controls**
  - Upper-left: **Back** button (not an “X”) when manual close/back is needed.
  - Upper-right: **(+) Add** button to add a new value on the fly.
- **Search/filter**
  - Supports search/filter behavior per `design/specs/mobile/global/general.md`.
- **Selection**
  - Type picker: single-select
  - Category picker: single-select, filtered to the selected Type
  - Items/Bundles picker: multi-select (bundles visually distinguished)
  - For all three pickers, a single tap on a list row selects it and closes the picker (returning to the previous screen).
    - For the multi-select Items/Bundles picker, this applies to the final “Done/Confirm” action: a single tap commits the selection and closes the picker.

Timestamp picker uses platform-native date/time picker UX.

## Empty database behavior (required)

This app may start with an **empty database** (no catalog rows).

- If there are **no Types**, the Type picker shows:
  - “No types yet”
  - CTAs:
    - **Import minimal starter categories (built-in)** (see `design/specs/mobile/global/general.md`)
    - **Browse more catalogs (online)** (see `design/specs/mobile/global/general.md`)
    - **Go to Catalog**
- If a Type exists but there are **no Items/Bundles** for that Type, the Items picker shows:
  - “No items yet”
  - CTAs:
    - **Go to Catalog**
    - **Browse more catalogs (online)** (see `design/specs/mobile/global/general.md`)

## Defaults and ordering

- Timestamp defaults to “now” in New/Clone modes.
- Pickers may show recently used or frequently used options first, but behavior should remain predictable and easy to understand.

## Validation

### On Save
- **Required**: type, timestamp
- **Items**: Required (at least one item and/or bundle must be selected)
- **Quantifiers**: If item has quantifiers defined, values are optional (can log item without quantifying)
- **Comment**: Optional

### Error Display
- Show error banner at top if validation fails
- Highlight missing required fields in red

## Behavior Notes

### Adding New Items/Categories (story 01, 02)
- Users can add taxonomy on the fly from within pickers using the **(+) Add** button.
  - If that flow is not available for a given picker, provide a clear “Go to Catalog” path.

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
  - Clone icon on entry → EditEntry (mode=clone, entryId=…)
  - Tap entry card → EditEntry (mode=edit, entryId=…)

### Exit Points
- Save → back to LogHistory (with success toast?)
- Cancel/Back → back to LogHistory (confirm if unsaved changes?)
- Delete (edit mode only) → confirm dialog → delete → back to LogHistory

## Theming & i18n
- Uses `useTheme()` for colors
- Uses `useT()` for all strings
- Modal pickers follow same theme
- All inputs use semantic colors (border, text, placeholders)

## Notes

- Keep this spec user-observable; implementation details belong in consolidations.