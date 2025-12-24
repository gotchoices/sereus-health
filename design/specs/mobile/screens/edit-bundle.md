# EditBundle Screen Spec

## Purpose
Create or edit a bundle (named collection of items). Bundles are type-specific—all member items must belong to the same type as the bundle.

## Layout Structure

```
┌─────────────────────────────────────────┐
│ ←  Add Bundle / Edit Bundle      💾     │  Header with save
├─────────────────────────────────────────┤
│                                         │
│  Name *                                 │
│  ┌─────────────────────────────────┐    │
│  │ [Bundle name input]             │    │
│  └─────────────────────────────────┘    │
│                                         │
│  Type *                                 │
│  [Activity] [Condition] [Outcome]       │  Type chips (readonly if editing)
│                                         │
│  ──────────────────────────────────     │
│  Items in Bundle                   (+)  │
│                                         │
│  ┌─────────────────────────────────┐    │
│  │ ≡  Bacon              Eating  🗑 │    │  Draggable item
│  └─────────────────────────────────┘    │
│  ┌─────────────────────────────────┐    │
│  │ ≡  Lettuce            Eating  🗑 │    │  Draggable item
│  └─────────────────────────────────┘    │
│  ┌─────────────────────────────────┐    │
│  │ ≡  Tomato             Eating  🗑 │    │  Draggable item
│  └─────────────────────────────────┘    │
│                                         │
│  [Empty: Tap + to add items]            │  Empty state hint
│                                         │
└─────────────────────────────────────────┘
```

## Key Behaviors

### Creating New Bundle
- Type pre-selected if passed from ConfigureCatalog
- Name is required
- At least one item required to save
- Items filtered to selected type only

### Editing Existing Bundle
- Name and items pre-populated
- Type is readonly (cannot change bundle's type)
- If bundle used in history, show warning about taxonomy lifecycle

### Adding Items (+)
- Opens item picker modal
- Shows items of bundle's type, organized by category
- Filter-as-you-type to find items
- Multi-select: tap items to toggle selection
- "Add Selected" button adds checked items to bundle
- Already-in-bundle items shown as disabled/checked

### Item Picker Modal
```
┌─────────────────────────────────────────┐
│ Add Items to Bundle               Done  │
├─────────────────────────────────────────┤
│ 🔍 [Search items...]                    │
├─────────────────────────────────────────┤
│ Eating                                  │  Category header
│  [ ] Omelette                           │
│  [✓] Bacon (already in bundle)          │  Disabled
│  [ ] Toast                              │
│  [ ] Orange Juice                       │
├─────────────────────────────────────────┤
│ Exercise                                │  Category header
│  [ ] Running                            │
│  [ ] Weights                            │
├─────────────────────────────────────────┤
│                                         │
│  [Add 3 Selected Items]                 │  Action button
│                                         │
└─────────────────────────────────────────┘
```

### Reordering Items
- Drag handle (≡) on left side of each item
- Drag to reorder within the list
- Order saved with bundle

### Removing Items
- Trash icon (🗑) on right side
- Tap to remove from bundle (no confirmation needed)
- Must keep at least one item

## Navigation

| Action | Target |
|--------|--------|
| ← Back | ConfigureCatalog (discard changes with confirm) |
| 💾 Save | ConfigureCatalog (save and return) |

## Data Requirements

### Input Props
```typescript
interface EditBundleParams {
  bundleId?: string;    // undefined for create
  type?: 'Activity' | 'Condition' | 'Outcome'; // pre-select type (create mode)
}
```

### Bundle Model
```typescript
interface BundleEdit {
  id?: string;
  name: string;
  typeId: string;
  items: BundleMemberEdit[];
}

interface BundleMemberEdit {
  itemId: string;
  itemName: string;
  categoryName: string;
  displayOrder: number;
}
```

## Variants

- **happy**: Editing existing bundle with items
- **error**: Validation error or save failure

## Notes

- Bundles are type-specific: only show items matching bundle's type
- Bundle nesting (bundles containing bundles) is supported in schema but deferred for MVP UI
- Taxonomy lifecycle: warn if editing bundle already used in log entries
- Order matters semantically (BLT = Bacon-Lettuce-Tomato)

