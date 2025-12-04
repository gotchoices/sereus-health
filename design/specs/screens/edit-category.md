# EditCategory Screen Spec

## Purpose
Create or edit a category. Categories are simple name+type entities, so this is typically rendered as a modal rather than a full screen.

## Layout (Modal)

```
┌─────────────────────────────────────────┐
│ Add Category / Edit Category            │
├─────────────────────────────────────────┤
│                                         │
│  Category Name *                        │
│  ┌─────────────────────────────────┐    │
│  │ [Category name input]           │    │
│  └─────────────────────────────────┘    │
│                                         │
│  Type *                                 │
│  [Activity] [Condition] [Outcome]       │  Readonly if editing
│                                         │
│  [Cancel]                     [Save]    │
│                                         │
└─────────────────────────────────────────┘
```

## Key Behaviors

### Creating New Category
- Type pre-selected from context (e.g., from EditItem's category picker)
- Name required, must be unique within type
- Save creates category and returns to caller

### Editing Existing Category
- Name pre-populated
- Type is readonly (cannot change category's type)
- If category has items, show count: "X items in this category"
- If category used in history, warn about taxonomy lifecycle

### Validation
- Name cannot be empty
- Name must be unique within the type (case-insensitive)

## Navigation

This is typically a modal, not a standalone screen. Invoked from:
- EditItem (category picker → "Create new category")
- ConfigureCatalog (future: category management section)

| Action | Result |
|--------|--------|
| Cancel | Close modal, discard changes |
| Save | Close modal, return new/updated category |

## Data Requirements

### Input Props
```typescript
interface EditCategoryParams {
  categoryId?: string;  // undefined for create
  typeId?: string;      // pre-select type (create mode)
  onSave?: (category: { id: string; name: string; typeId: string }) => void;
  onCancel?: () => void;
}
```

## Variants

- **happy**: Simple create/edit flow

## Notes

- This is intentionally minimal; categories are just name+type
- Consider future: category icons, colors, or descriptions
- Inline creation from EditItem should use this same modal component

