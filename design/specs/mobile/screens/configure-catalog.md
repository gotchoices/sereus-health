# ConfigureCatalog Screen Spec

## Purpose
Manage the catalog of items, categories, and bundles used for logging. The catalog is organized by Type, with items grouped into categories.

## Layout

- Header: title “Catalog”
  - Search toggle (optional; see `design/specs/mobile/global/general.md` filter rules)
  - **(+) Add** action
  - Optional overflow/menu for Import/Export
- Type selector: visible when at least one Type exists
- View toggle: `Items | Bundles`
- Content: scrollable list (items or bundles)
- Bottom tab bar: see `design/specs/mobile/navigation.md`

## Key Behaviors

### Type selector

- Applies to both Items and Bundles views.
- Shows the available Types (no seeded assumptions).
- Selecting a Type filters the list below to that Type.

### Items view

- Shows items for the selected Type (grouped by category implicitly).
- Each row/card shows: item name, category label, and chevron.
- Search filters by item name and category name.

### Bundles view

- Shows bundles for the selected Type.
- Each row/card shows: bundle icon, bundle name, item count, and chevron.
- Search filters by bundle name.

### (+) Add

- Located in the header (upper-right).
- Behavior depends on the active view:
  - Items → create a new Item (with Type pre-selected)
  - Bundles → create a new Bundle (with Type pre-selected)

### Empty states (required)

**No Types yet** (catalog is empty):

- Show a “Get started” panel with:
  - **Import minimal starter categories (built-in)** (see `design/specs/mobile/global/general.md`)
  - **Browse more catalogs (online)** (see `design/specs/mobile/global/general.md`)
  - A clear path to create the first Type (via (+) Add, if supported; otherwise via a Settings/Catalog flow)

**Items empty** (for the selected Type):

- Show “No items yet”
- CTAs:
  - “Add your first [Type] item”
  - “Browse more catalogs (online)” (see `design/specs/mobile/global/general.md`)

**Bundles empty** (for the selected Type):

- Show “No bundles yet”
- CTA: “Create a bundle”

## Navigation

| Action | Target |
|--------|--------|
| Tap item card | `EditItem` |
| Tap bundle card | `EditBundle` |
| Tap (+) in Items view | `EditItem` (Type pre-selected) |
| Tap (+) in Bundles view | `EditBundle` (Type pre-selected) |
| Bottom tab navigation | See `design/specs/mobile/navigation.md` |

## Import / Export (data portability)

- ConfigureCatalog exposes **Import Catalog** and **Export Catalog** actions.
- Formats and idempotency rules are defined in `design/specs/domain/import-export.md`.

