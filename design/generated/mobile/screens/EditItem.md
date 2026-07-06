---
provides:
  - screen:mobile:EditItem
needs:
  - schema:taxonomy
dependsOn:
  - design/stories/mobile/02-daily.md
  - design/stories/mobile/03-configuring.md
  - design/specs/mobile/screens/edit-item.md
  - design/specs/mobile/screens/edit-category.md
  - design/specs/mobile/global/general.md
  - design/specs/domain/taxonomy.md
  - design/specs/domain/rules.md
---

# EditItem Screen Consolidation

## Purpose

Full editor for a catalog item — name, description, category, and quantifier definitions.
This is the **advanced/explicit** item editor. The fast path during logging is EditEntry's
**Quick-Add Item** sheet; its "More options" opens this screen. Also reached from ConfigureCatalog.

## Route
- `EditItem` · params `itemId?` (undefined = create), `type?` (pre-selected type in create mode).

## Layout (single scroll)
- Header: Back (←, confirm if dirty) · title "Add Item" / "Edit Item" · **Save** (💾).
- **Name** (required).
- **Description** (optional).
- **Type** — segmented `Activity / Condition / Outcome` (data-driven; **readonly when editing** — an item's Type is fixed).
- **Category** (required) — a select-or-create field: filter-as-you-type over the Type's categories, with a
  persistent **"+ Create new category"** row that creates it immediately (the `EditCategory` modal — name only).
- **Quantifiers** — list of the item's quantifier definitions; **(+)** adds, ✏️ edits, 🗑 deletes (confirm if the
  item is used in history). Each: name, optional min/max, optional units — edited in the **Quantifier editor modal**.

## Retire vs delete
- Editing an item that history references is allowed (name-edit scope + retire/hide follow `rules.md`). Prefer
  **retire** (from ConfigureCatalog) over hard delete for in-use items.

## Behavior
- **Create**: Type may be pre-selected; Name + Category required; Save upserts the item (idempotent by
  `(category, name)`) and its quantifiers, then returns to the caller (ConfigureCatalog, or back into the entry
  when invoked via Quick-Add's "More options").
- **Edit**: fields prepopulated; Type readonly; Save persists name/description/category + quantifier set.
- Category inline-create persists immediately (shared `EditCategory` modal — see its spec).

## Async / activity
Load + save `track()`ed per `async-activity.md`; results applied only if still mounted.

## Data (`data/editItem.ts`, `db/catalog.ts`)
`getItemDetail(itemId)` · `getCategoriesForType(type)` · `upsertItem({ id?, name, description?, typeName,
categoryName, quantifiers[] })` (replace-all quantifiers) · create-category helper.

## Mock variants
- **happy**: editing an item with 2 quantifiers.
- **error**: validation (missing name/category) or save failure.

## i18n
Existing `editItem.*` keys (name/description/type/category/quantifier editor). No new keys required beyond
those in `edit-item.md`.

---
**Status**: Regenerated — advanced editor; integrates as the "More options" target of EditEntry Quick-Add; retire-aware
**Last Updated**: 2026-07-05
