# Inline Taxonomy Editing

Whenever the user selects from taxonomy lists (types, categories, items), they can add new entries inline without leaving the current flow.

## Applies To

- **Types**: Activity, Condition, Outcome (and user-defined)
- **Categories**: Eating, Exercise, etc. within each type
- **Items**: Specific entries within each category
- **Bundles**: Created from selected items

## Add Inline Pattern

When viewing any taxonomy list for selection:

1. **"+" icon** appears right-justified on the search/filter bar (same line as search input)
2. Consistent with main screen's add icon placement
3. Tapping opens an inline form or modal:
   - Name field (required)
   - Parent context auto-filled (e.g., new item inherits current category)
4. On save, new entry appears in list and can be immediately selected
5. On cancel, returns to selection without changes

## Bundle Creation During Logging

When multiple items are selected in EditEntry:

1. **"Save as Bundle"** action appears (button or menu option)
2. Tapping opens bundle naming modal:
   - Bundle name field
   - Shows list of selected items for confirmation
3. On save:
   - Bundle is created in catalog
   - Current selection remains (bundle not auto-selected)
   - User can choose to select the bundle instead if desired
4. Bundle is available for future entries

## UI Guidelines

- **"+" icon** in search bar (right side), same style as main screen header
- Discoverable but compact - doesn't take extra vertical space
- New entries should appear highlighted/animated briefly after creation
- Validation: prevent duplicate names within same parent

## Not Included

- **Edit existing**: Modifying taxonomy entries stays in ConfigureCatalog
- **Delete**: Removing entries stays in ConfigureCatalog (with referential integrity checks)

These restrictions keep the entry flow focused on logging while allowing quick additions.

