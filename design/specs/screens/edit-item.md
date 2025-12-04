# EditItem Screen Spec

## Purpose
Create or edit an individual catalog item, including its name, description, category assignment, and quantifier definitions.

## Layout Structure

```
┌─────────────────────────────────────────┐
│ ←  Add Item / Edit Item         💾      │  Header with save
├─────────────────────────────────────────┤
│                                         │
│  Name *                                 │
│  ┌─────────────────────────────────┐    │
│  │ [Item name input]               │    │
│  └─────────────────────────────────┘    │
│                                         │
│  Description (optional)                 │
│  ┌─────────────────────────────────┐    │
│  │ [Description textarea]          │    │
│  └─────────────────────────────────┘    │
│                                         │
│  Type *                                 │
│  [Activity] [Condition] [Outcome]       │  Type chips (readonly if editing)
│                                         │
│  Category *                             │
│  ┌────────────────────────────── ▼ ┐    │
│  │ Select or create category...    │    │  Dropdown with inline create
│  └─────────────────────────────────┘    │
│                                         │
│  ──────────────────────────────────     │
│  Quantifiers                       (+)  │
│  ┌─────────────────────────────────┐    │
│  │ Intensity (1-10)           ✏️ 🗑 │    │  Existing quantifier
│  └─────────────────────────────────┘    │
│  ┌─────────────────────────────────┐    │
│  │ Duration (minutes)         ✏️ 🗑 │    │  Existing quantifier
│  └─────────────────────────────────┘    │
│                                         │
└─────────────────────────────────────────┘
```

## Key Behaviors

### Creating New Item
- Type pre-selected if passed from ConfigureCatalog
- Name is required, description optional
- Category must be selected or created inline
- Save creates item and returns to catalog

### Editing Existing Item
- All fields pre-populated from existing item
- Type is readonly (cannot change item's type)
- If item is used in history, show warning about taxonomy lifecycle

### Category Selection
- Dropdown shows categories for selected type
- Filter-as-you-type to find category
- Inline "Create new category" option at bottom
- Creating category also creates it in the database
- Category is required when saving (cannot be empty)

### Quantifier Management
- List existing quantifiers if editing
- (+) button opens quantifier editor modal
- Each quantifier shows: name, range (if defined), units
- Edit (✏️) opens editor modal pre-filled
- Delete (🗑) removes quantifier (confirm if item used in history)

### Quantifier Editor Modal
```
┌─────────────────────────────────────────┐
│ Add Quantifier / Edit Quantifier        │
├─────────────────────────────────────────┤
│  Name *                                 │
│  [e.g., Intensity, Duration, Amount]    │
│                                         │
│  Min Value (optional)                   │
│  [1]                                    │
│                                         │
│  Max Value (optional)                   │
│  [10]                                   │
│                                         │
│  Units (optional)                       │
│  [e.g., scale, minutes, reps]           │
│                                         │
│  [Cancel]              [Save Quantifier]│
└─────────────────────────────────────────┘
```

## Navigation

| Action | Target |
|--------|--------|
| ← Back | ConfigureCatalog (discard changes with confirm) |
| 💾 Save | ConfigureCatalog (save and return) |

## Data Requirements

### Input Props
```typescript
interface EditItemParams {
  itemId?: string;      // undefined for create
  typeId?: string;      // pre-select type (create mode)
}
```

### Item Model
```typescript
interface ItemEdit {
  id?: string;
  name: string;
  description?: string;
  categoryId: string;
  quantifiers: QuantifierEdit[];
}

interface QuantifierEdit {
  id?: string;
  name: string;
  minValue?: number;
  maxValue?: number;
  units?: string;
}
```

## Variants

- **happy**: Editing existing item with quantifiers
- **error**: Validation error or save failure

## Notes

- Taxonomy lifecycle: warn if editing item already used in log entries
- Category inline creation should persist immediately
- Quantifier changes saved with item (not independently)

