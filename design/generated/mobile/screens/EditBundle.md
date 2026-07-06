---
provides:
  - screen:mobile:EditBundle
needs:
  - schema:taxonomy
  - schema:bundles
dependsOn:
  - design/stories/mobile/03-configuring.md
  - design/specs/mobile/screens/edit-bundle.md
  - design/specs/mobile/global/general.md
  - design/specs/domain/bundles.md
  - design/specs/domain/rules.md
---

# EditBundle Screen Consolidation

## Purpose

Create / edit a **bundle** — a named, ordered collection of items for one Type, used for fast logging.
All members belong to the bundle's Type (type affinity). Reached from ConfigureCatalog (Bundles view).

## Route
- `EditBundle` · params `bundleId?` (undefined = create), `type?` (pre-selected type in create mode).

## Layout (single scroll)
- Header: Back (←, confirm if dirty) · "Add Bundle" / "Edit Bundle" · **Save** (💾).
- **Name** (required, unique within Type).
- **Type** — segmented (readonly when editing).
- **Items in Bundle** — ordered list; each row: drag handle (≡) · item name · category (muted) · remove (🗑).
  **(+)** opens the item picker. Empty hint: "Tap + to add items." At least one item required to save.

## Item picker (shared with EditEntry)
Same picker component as EditEntry's Item Picker, scoped to the bundle's Type: search across categories,
optional category-filter chips, multi-select, and **inline "+ Create '<query>'"** (Quick-Add Item) so a
missing item can be created without leaving the bundle. Already-in-bundle rows show as checked/disabled.
(Bundles are not offered as members in MVP — nesting is deferred; see `bundles.md`.)

## Reorder & remove
- Drag (≡) to reorder — order is semantic (BLT = Bacon-Lettuce-Tomato) and saved as `displayOrder`.
- 🗑 removes a member (no confirm); must keep ≥1.

## Retire / lifecycle
Editing a bundle referenced by history is allowed; prefer **retire** over delete for in-use bundles (`rules.md`).
Note: log entries store *expanded items* with a source-bundle reference, so editing a bundle does not alter
past entries (`logging.md` bundle-expansion).

## Async / activity
Load + save `track()`ed per `async-activity.md`.

## Data (`data/editBundle.ts`, `db/catalog.ts`)
Load bundle + members (ordered) · item picker uses `getItemStats`/catalog reads for the Type · Quick-Add reuses
the catalog upsert · save persists name + ordered members.

## Mock variants
- **happy**: editing a bundle with 3 ordered items.
- **error**: no items on save / save failure.

## i18n
Existing `editBundle.*` keys; the picker + Quick-Add reuse EditEntry's `editEntry.pickerCreate` / `quickAdd*` keys.

---
**Status**: Regenerated — shares the EditEntry item picker + inline Quick-Add; ordered members; retire-aware
**Last Updated**: 2026-07-05
