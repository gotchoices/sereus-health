---
provides:
  - screen:mobile:EditCategory
needs:
  - schema:taxonomy
dependsOn:
  - design/stories/mobile/03-configuring.md
  - design/specs/mobile/screens/edit-category.md
  - design/specs/mobile/screens/configure-catalog.md
  - design/specs/mobile/global/general.md
  - design/specs/domain/taxonomy.md
  - design/specs/domain/rules.md
---

# EditCategory Modal Consolidation

## Purpose

Create or edit a **category** — a name within a Type — plus its lifecycle actions
(retire/restore, delete-when-empty). Implemented as a small centered **modal**
(`components/EditCategoryModal.tsx`), not a routed screen. Reached from
ConfigureCatalog's **Categories** segment: **(+)** → create; tapping a category card → edit.

This closes the "missing middle" of the taxonomy: Types and Items/Bundles each had an
editor, but categories could previously only be *born* inline (as a side effect of item
creation) and never renamed, retired, or cleaned up.

## Invariants (from `screens/edit-category.md`)
- **Name** required; **unique within its Type** (case-insensitive).
- **Type** is set from context on create and is **read-only** (shown as "in {Type}"). An item/category's Type never changes.
- A category is also creatable **inline** wherever one is selected (item editor / logging) — see `global/general.md` · Inline creation. This modal is the explicit management surface.
- Editing/retiring a category referenced by history follows the taxonomy lifecycle (`domain/rules.md`): prefer retire over hard delete when in use.

## Layout (modal card)
- Title: **"Add Category"** / **"Edit Category"** · subtitle **"in {Type}"**.
- **Name** field (autofocus); inline validation error below it.
- **Cancel** · **Save** (primary).
- **Edit mode only**, below a divider:
  - **Retire (hide from new entries)** / **Restore category** (toggles by current state).
  - **Delete category** — enabled **only when the category is empty** (`itemCount === 0`);
    when in use it is disabled and reads **"In use by {n} item(s) — retire instead of deleting."**
  - When retired, a note reads: "Retired — hidden when choosing a category for new items."

## Behavior
- **Create**: `createCategory(typeName, name)` — idempotent by unique `(type_id, name)`.
- **Rename**: `renameCategory(id, name)`; a duplicate name (case-insensitive, within the Type)
  surfaces the inline **duplicate** error (client pre-check + DB `duplicate-name` backstop).
- **Retire / Restore**: `setCategoryRetired(id, bool)`. Retire is confirmed via a dialog; restore is immediate.
  Retired categories are excluded from `getCategoriesForType` (item create/re-categorize pickers) but remain in the Categories management list.
- **Delete**: `deleteCategory(id)` — hard delete, guarded by a confirm dialog; the DB throws `not-empty`
  if items still reference it (belt-and-suspenders with the disabled UI).
- On any successful mutation the modal closes and ConfigureCatalog re-fetches categories (its `reloadKey` bump), so counts/order/labels refresh.

## Validation / errors
- Empty name → "Name is required."
- Duplicate name → "A category with that name already exists in {Type}."
- Save failure → "Could not save the category."

## Data (`data/configureCatalog.ts` → `db/catalog.ts`)
`getCategoriesWithCounts(typeName)` (list incl. empty/retired + counts) · `createCategory` ·
`renameCategory` (throws `duplicate-name`) · `setCategoryRetired` · `deleteCategory` (throws `not-empty`).
Counts use a scalar subquery, not `GROUP BY` (avoids Quereus's duplicate-`id`-in-scope error).

## Props
`visible` · `mode: 'create'|'edit'` · `typeName` · `category?: CategoryRow` ·
`existingNames: string[]` (lower-cased siblings, for uniqueness) · `onCancel` · `onSave(name)` ·
`onToggleRetire?` · `onDelete?`.

## Mock variants
- **create**: empty name field under a Type.
- **edit (empty)**: existing category, 0 items → Delete enabled.
- **edit (in use)**: existing category, N items → Delete disabled with "retire instead" hint.
- **error**: duplicate name → inline duplicate error.

## i18n keys
```
editCategory.addTitle: "Add Category"
editCategory.editTitle: "Edit Category"
editCategory.inType: "in {type}"
editCategory.nameLabel: "Name"
editCategory.namePlaceholder: "Category name…"
editCategory.save: "Save"
editCategory.errorRequired: "Name is required."
editCategory.errorDuplicate: "A category with that name already exists in {type}."
editCategory.saveError: "Could not save the category."
editCategory.retiredNote: "Retired — hidden when choosing a category for new items."
editCategory.retire: "Retire (hide from new entries)"
editCategory.restore: "Restore category"
editCategory.retireConfirmTitle: "Retire category?"
editCategory.retireConfirmBody: "\"{name}\" will be hidden when choosing a category for new items. Existing items and history are unaffected."
editCategory.delete: "Delete category"
editCategory.deleteBlocked: "In use by {count} item(s) — retire instead of deleting."
editCategory.deleteConfirmTitle: "Delete category?"
editCategory.deleteConfirmBody: "This permanently removes the empty category “{name}”."
```

---
**Status**: Generated — new category management modal; complements EditItem's inline create draft; retire/rename/delete-when-empty
**Last Updated**: 2026-07-06
