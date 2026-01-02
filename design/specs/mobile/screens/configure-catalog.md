# ConfigureCatalog Screen Spec

## Purpose
Manage the catalog of items, categories, and bundles that Bob uses when logging entries. The catalog is organized by type (Activity, Condition, Outcome), with items grouped into categories and optionally organized into bundles.

## Layout Structure

```
┌─────────────────────────────────────────┐
│ Catalog                      🔍  (+)    │  Header
├─────────────────────────────────────────┤
│ [Search filter input]                   │  (visible when 🔍 active)
├─────────────────────────────────────────┤
│ Activity │ Condition │ Outcome          │  Type selector (always visible)
├─────────────────────────────────────────┤
│ [Items]  [Bundles]                      │  View toggle (filtered by type)
├─────────────────────────────────────────┤
│                                         │
│  Item/Bundle cards...                   │  Scrollable list
│                                         │
├─────────────────────────────────────────┤
│  🏠 Home    📋 Catalog    ⚙️ Settings   │  Bottom tabs
└─────────────────────────────────────────┘
```

## Key Behaviors

### Type Selector
- Always visible below header
- Applies to both Items and Bundles views
- Selected type highlighted with type-specific color (Activity=blue, Condition=amber, Outcome=green)

### Items View
- Shows all items belonging to categories of the selected type
- Each card displays: name, category, chevron for navigation
- Tap → navigates to EditItem screen
- Filter searches by item name or category name

### Bundles View
- Shows all bundles of the selected type
- Each card displays: bundle icon, name, item count, chevron
- Tap → navigates to EditBundle screen
- Filter searches by bundle name

### Add Button (+)
- In header, right side
- When Items tab active → navigates to EditItem with type pre-selected
- When Bundles tab active → navigates to EditBundle with type pre-selected

### Empty States
- Items empty: "No items yet" + "Add your first [Type] item" button
- Bundles empty: "No bundles yet" + "Create a bundle to group items together"

## Navigation

| Action | Target |
|--------|--------|
| Tap item card | EditItem (id=item.id) |
| Tap bundle card | EditBundle (id=bundle.id) |
| Tap (+) in Items view | EditItem (type=selectedType) |
| Tap (+) in Bundles view | EditBundle (type=selectedType) |
| Bottom tab: Home | LogHistory |
| Bottom tab: Settings | Settings |

## Import / Export (data portability)

- Expose **Export Catalog** and **Import Catalog** actions from ConfigureCatalog.
- Export format: CSV per `design/specs/api/import-export.md`.
- Import supports CSV/YAML and is idempotent per `design/specs/api/import-export.md`.

## Data Requirements

### Items List
```typescript
interface CatalogItem {
  id: string;
  name: string;
  type: 'Activity' | 'Condition' | 'Outcome';
  category: string;
  hasQuantifiers: boolean;
}
```

### Bundles List
```typescript
interface CatalogBundle {
  id: string;
  name: string;
  type: 'Activity' | 'Condition' | 'Outcome';  // NEW: bundles are typed
  itemCount: number;
}
```

## Variants

- **happy**: Catalog has items and bundles across all types
- **empty**: No items or bundles; emphasizes onboarding path
- **error**: Network/data error state

## Related Screens

- **EditItem**: Create/edit individual items with quantifiers
- **EditBundle**: Create/edit bundles with member management
- **EditCategory**: Create/edit categories (inline modal or separate screen TBD)

## Notes

- Bundles are type-specific (cannot mix Activity items with Outcome items)
- When editing items/bundles already used in history, follow taxonomy lifecycle rules (see general.md)
- Categories are not directly visible in list; they appear as metadata on item cards
- Consider future enhancement: category filtering chips within a type

