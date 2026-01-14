---
provides:
  - screen:mobile:EditEntry
needs:
  - schema:taxonomy
  - schema:bundles
  - schema:logging
dependsOn:
  - design/stories/mobile/01-exploring.md
  - design/stories/mobile/02-daily.md
  - design/stories/mobile/03-configuring.md
  - design/stories/mobile/05-cloning.md
  - design/stories/mobile/08-reminders.md
  - design/specs/mobile/screens/edit-entry.md
  - design/specs/mobile/screens/index.md
  - design/specs/mobile/navigation.md
  - design/specs/mobile/global/general.md
  - design/specs/mobile/global/ui.md
  - design/specs/domain/taxonomy.md
  - design/specs/domain/bundles.md
  - design/specs/domain/logging.md
---

# EditEntry Screen Consolidation

## Purpose
Single comprehensive form for creating, editing, or cloning log entries. Modal picker pattern for type/category/item selection provides efficiency (story 02: "not be a distraction") while maintaining overview and context.

## Modes

### New Mode (stories 01, 02, 08)
- **Entry point**: LogHistory "+" button, or notification deep link (story 08:17)
- **Initial state**: All fields empty/default
- **Timestamp**: Current time (editable)
- **Type**: No selection (required before proceeding)
- **Items**: Empty (optional for note entries)
- **Comment**: Empty (optional, but typical for note entries)
- **CTA**: "Add Entry"

### Edit Mode (story 02:19, implied)
- **Entry point**: Tap entry card in LogHistory
- **Initial state**: All fields pre-populated from `entryId`
- **Timestamp**: Original entry time (editable)
- **Type**: Pre-selected (can change, affects available categories)
- **Items/Bundles**: Pre-selected (can modify)
- **Quantifiers**: Pre-filled values (can modify)
- **Comment**: Pre-filled (can modify)
- **CTA**: "Save"
- **Delete**: Trash icon in header (with confirmation)

### Clone Mode (story 05)
- **Entry point**: Clone icon on LogHistory entry card
- **Initial state**: Copy all fields from `entryId` **except** timestamp
- **Timestamp**: **Current time** (story 05:5 - "Perfect")
- **Type**: Copied from source
- **Items/Bundles**: Copied from source (story 05:4 - "All of the fields")
- **Quantifiers**: Copied values (story 05:6 - adjustable before commit)
- **Comment**: Copied from source
- **User flow**: Review → Adjust if needed (story 05:6) → Commit
- **CTA**: "Clone Entry"

## Layout Structure

### Header
- **Back/Cancel** button (←) on left
- **Title** (center): "New Entry" | "Edit Entry" | "Clone Entry"
- **Delete** button (trash icon) on right (edit mode only, with confirmation dialog)

### Form Body (single scrollable screen)

Per spec (specs/screens/EditEntry.md), single scrolling form with modal pickers.

**1. Type Selector** (required)
- **Stories**: 01:3, 02:3-4
- **Display**: Chip/card with type name OR "Select Type" placeholder
- **Interaction**: Tap → Modal picker (Activity, Condition, Outcome, + user-defined types)
- **Selection**: Single-select (radio pattern or tap-to-select)
- **Side effect**: Enables Category selector, resets category/items if type changed

**2. Category Selector** (required, disabled until type selected)
- **Stories**: 01:5, 02:5
- **Display**: Chip/card with category name OR "Select Category" placeholder (grayed if disabled)
- **Interaction**: Tap → Modal picker with categories filtered by selected type
- **Selection**: Single-select
- **Side effect**: Enables Items selector, resets items if category changed

**3. Items Selector** (optional - can skip for note entries)
- **Stories**: 01:6-9 (add new items inline or via Catalog), 03:8-10 (filter), 03:19 (bundles)
- **Display**: 
  - Chip list of selected item/bundle names
  - OR "Select Items" placeholder
  - OR "Skip (comment-only note)" hint if no items
- **Interaction**: Tap → Full-screen modal with SelectionList component
- **Modal contents**:
  - Filter input at top (story 03:9 - "bac" → bacon)
  - Multi-select checkboxes
  - Items from selected category
  - All bundles (story 03:19 - BLT shows as bundle with members preview)
  - "Done" button to confirm
- **Note**: Can have 0 items for comment-only entries (schema allows nullable type for notes)

**4. Quantifiers Section** (conditional - shows if any selected item has quantifiers)
- **Stories**: 02:8-9 (add quantifier to item), 02:12 (select intensity 7), 02:20 (multiple quantifiers: headache intensity + duration), 05:6 (adjust quantifier)
- **Display**:
  - For each selected item that has quantifiers defined:
    - **Subheading**: Item name (e.g., "Stomach Pain")
    - **For each quantifier on that item**:
      - Label: Quantifier name + units/range (e.g., "Intensity (1-10)")
      - Input: Numeric input with optional stepper +/-
      - Validation: min/max as defined
      - Optional: All quantifier values are optional (can log item without quantifying)
- **Bundle expansion**: If bundle selected, show quantifiers for each member item (story 03:12)
- **Collapsible**: Consider collapsible sections if many quantifiers

**5. Timestamp Selector**
- **Stories**: 01:10 ("sets that back to 8am"), 05:5 ("date/time has been set to the current time")
- **Display**: Formatted date/time in device locale (e.g., "Nov 29, 2025 at 10:30 AM")
- **Interaction**: Tap → Native DateTimePicker (platform-specific)
- **Default**: Current time (new/clone), original time (edit)
- **Editable**: Always

**6. Comment Input** (optional)
- **Stories**: 02:28 (notes reason for stress), note entries (schema: 0 items + comment)
- **Display**: Multi-line text input
- **Placeholder**: "Add a note (optional)..."
- **Optional**: But typically present for note entries with 0 items
- **Length**: Reasonable limit (e.g., 1000 chars) or unlimited

### Footer
- **Primary CTA**: Full-width button
  - Label: "Add Entry" (new), "Save" (edit), "Clone Entry" (clone)
  - Enabled when: Type selected, timestamp valid (items optional for notes)
  - On press: Validate → Save → Navigate back to LogHistory
- **Secondary**: "Cancel" link (or rely on header back button)

## Modal Picker Implementations

### Type Picker Modal
- **Trigger**: Tap Type Selector
- **Layout**: Full-screen or bottom sheet
- **Header**: "Select Type" + Close (×)
- **Content**: List of types (Activity, Condition, Outcome, + user-defined)
- **Interaction**: Single-select (tap or radio)
- **On selection**: Close modal, update Type Selector, enable Category Selector

### Category Picker Modal
- **Trigger**: Tap Category Selector (only if type selected)
- **Layout**: Full-screen or bottom sheet
- **Header**: "Select Category" + Close (×)
- **Content**: Categories filtered by selected type
- **Interaction**: Single-select
- **On selection**: Close modal, update Category Selector, enable Items Selector

### Items Picker Modal
- **Trigger**: Tap Items Selector (only if category selected)
- **Layout**: Full-screen (needs space for filter + multi-select)
- **Header**: "Select Items" + "Done" button
- **Content**:
  - Filter input (story 03:9)
  - SelectionList component:
    - Multi-select checkboxes
    - Items from selected category
    - All bundles (with member preview: "BLT: bacon, lettuce, tomato, ...")
    - Scrollable
- **Interaction**: Multi-select (check/uncheck)
- **On Done**: Close modal, update Items Selector chips, show quantifiers section if applicable

### Date/Time Picker
- **Trigger**: Tap Timestamp Selector
- **Implementation**: Native RN DateTimePicker
- **Mode**: datetime
- **Locale**: Device locale
- **On confirm**: Update Timestamp Selector display

## Validation

### On Save (per schema and spec)
- **Required fields**:
  - Type (always)
  - Timestamp (always)
  - Category (only if items > 0)
- **Optional fields**:
  - Items (can be 0 for note entries)
  - Quantifiers (even if item has quantifiers defined, values are optional)
  - Comment (optional, but typical for note entries)

### Error Handling
- Show error banner at top of form if validation fails
- Highlight missing required fields with red border/text
- Disable save button until required fields valid

## Behavior Notes

### Adding New Items/Categories (stories 01:7, 02:7)
- **Current approach** (per spec): Out of scope for EditEntry
- **User flow**: Cancel EditEntry → Navigate to Catalog → Add item → Return to EditEntry and start over
- **Future enhancement**: "Add New Item" link in Items Picker modal that navigates to Catalog with deep link back to EditEntry

### Bundle Handling (story 03:14-19)
- Bundles appear in Items Picker alongside individual items
- Bundle preview shows member items: "(BLT: bacon, lettuce, tomato, bread, mayo)"
- On save, bundle expands to individual items (immutable snapshot per schema)
- Quantifiers: If bundle members have quantifiers defined, show all in Quantifiers Section (all optional)

### Quantifier Display
- Only show Quantifiers Section if at least one selected item has quantifiers
- If item has 0 quantifiers → no section for that item
- If item has 2+ quantifiers (story 02: headache intensity + duration) → show both in sequence
- All quantifier values optional (can log item without quantifying)

### Clone Behavior (story 05)
- Copy all fields **except** timestamp
- Timestamp set to current time (story 05:5 - "Perfect")
- User can adjust any field before commit (story 05:5-6)
- Quantifiers copied as-is, adjustable (story 05:6 - "adjusts a quantifier")

## Navigation

### Entry Points
- **LogHistory "+" button** → EditEntry (mode=new)
- **LogHistory entry card tap** → EditEntry (mode=edit, entryId=X)
- **LogHistory clone icon** → EditEntry (mode=clone, entryId=X)
- **Notification deep link** (story 08:17) → EditEntry (mode=new)

### Exit Points
- **Save** → Back to LogHistory (with optional success toast)
- **Cancel/Back** → Back to LogHistory (consider confirm dialog if unsaved changes)
- **Delete** (edit mode) → Confirmation dialog → Delete → Back to LogHistory

## Data Requirements (API/Engine Stubs)

### Read Operations

**Stats APIs (for smart defaults and usage-based ordering)**:
- `getTypeStats(variant?)` → Array<{id, name, usageCount}>
  - Returns all types with usage counts from log history
  - Used for: Auto-select most common type, order type picker
- `getCategoryStats(typeId, variant?)` → Array<{id, name, usageCount}>
  - Returns categories for given type with usage counts
  - Used for: Auto-select most common category, order category picker
- `getItemStats(categoryId, variant?)` → Array<{id, name, usageCount, isBundle}>
  - Returns items for given category with usage counts
  - Includes both individual items and bundles
  - Used for: Order items picker by frequency

**Entity APIs (for full data)**:
- `getTypes(variant?)` → Array<{id, name}>
- `getCategories(typeId, variant?)` → Array<{id, name, typeId}>
- `getItems(categoryId, variant?)` → Array<{id, name, categoryId, quantifiers[]}>
- `getBundles(variant?)` → Array<{id, name, memberIds[], memberNames[]}>
- `getLogEntry(entryId, variant?)` → LogEntry (for edit/clone modes)

### Write Operations
- `createLogEntry(data)` → {success, entryId}
- `updateLogEntry(entryId, data)` → {success}
- `deleteLogEntry(entryId)` → {success}

### Mock Variants
- **happy**: Realistic usage stats (Activity=100, Condition=50, Outcome=30; Eating=80, Exercise=40; Omelette=50, BLT=30)
- **empty**: No usage data (all counts = 0, defaults to first alphabetically)
- **bundle**: Include bundles in item stats with usage counts
- **balanced**: Equal usage across all types/categories (test tie-breaking)
- **quantifiers**: Entry with multiple quantifiers (headache: intensity + duration)
- **note**: Entry with 0 items, just comment (schema allows)

## Theming & i18n
- Uses `useTheme()` for all colors (background, surface, text, borders, accents)
- Uses `useT()` for all UI strings (labels, placeholders, buttons, validation messages)
- Modal pickers follow same theme
- Inputs use semantic colors (primary/secondary text, borders, placeholders)

## UI/UX Best Practices
- **Speed** (story 02: "not be a distraction", story 05:7 "That was fast")
  - Single screen (no multi-step wizard)
  - **Smart defaults**: Auto-select most common type/category (new mode)
  - **Usage-based ordering**: Most logged items appear first
  - Quick access to common actions
  - Clone for rapid re-entry
- **Efficiency**:
  - **Search filters**: All pickers include live search (story 03:9 "bac" → bacon)
  - Case-insensitive substring matching
  - "No results found" empty state
- **Clarity**: Modal pickers keep context visible (user sees main form behind modal)
- **Validation**: Immediate feedback, clear error messages
- **Accessibility**: Touch targets ≥44px, high contrast, semantic labels
- **Progressive disclosure**: Only show quantifiers section if applicable
- **Flexibility**: Support both structured entries (items + quantifiers) and free-form notes (comment only)

---

## Open Questions (Future Refinement)
- Unsaved changes warning when tapping back?
- Success toast/snackbar after save?
- Inline "Add New Item" link in pickers vs. always require Catalog navigation?
- Stepper buttons for quantifier inputs vs. numeric keyboard only?
- Maximum number of items selectable in one entry?
- Autosave draft entries?

---

**Consolidated**: 2025-11-29
**Precedence**: specs/screens/EditEntry.md > this consolidation > defaults
