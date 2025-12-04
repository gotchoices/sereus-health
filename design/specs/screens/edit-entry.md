# EditEntry Screen Spec

## Purpose

Create, edit, or clone a log entry. Guides user through type → category → item selection with inline add capability at each level.

## Entry Flow

### Step 1: Type Selection
- List of types: Activity, Condition, Outcome (plus user-defined)
- **"+ Add Type"** at bottom of list (see `global/inline-taxonomy.md`)
- Single select, then auto-advance to categories

### Step 2: Category Selection  
- Categories filtered by selected type
- **"All"** as first option—shows all items across all categories of this type
- **"+ Add Category"** at bottom (inherits selected type)
- Single select, then auto-advance to items

### Step 3: Item Selection
- Items filtered by selected category (or all categories if "All" was selected)
- **"+ Add Item"** at bottom (inherits selected category)
- **Multi-select** with checkboxes
- Filter/search input at top

### Step 4: Bundle Option
When 2+ items selected:
- **"Save as Bundle"** button appears above item list
- Opens bundle naming modal
- See `global/inline-taxonomy.md` for flow

### Step 5: Quantifiers & Details
- For each selected item with quantifiers defined, show input fields
- Date/time picker (defaults to now)
- Optional comment field

### Step 6: Confirm
- Review summary of entry
- Save button

## Modes

| Mode | Behavior |
|------|----------|
| `new` | Empty entry, current timestamp |
| `edit` | Pre-populated from existing entry |
| `clone` | Pre-populated but new timestamp, new ID |

## Header

- **Back button** (left): Returns to previous screen
- **Title**: "New Entry" / "Edit Entry" / "Clone Entry" based on mode
- **Save button** (right): Confirms entry (disabled until valid)

## Add Inline Modals

### Add Type Modal
- Name field
- Color picker (optional, for badge color)

### Add Category Modal
- Name field
- Type auto-selected (read-only display)

### Add Item Modal
- Name field  
- Category auto-selected (read-only display)
- Optional: Add quantifier definitions

### Save as Bundle Modal
- Bundle name field
- List of items being bundled (read-only)
- Save / Cancel buttons

