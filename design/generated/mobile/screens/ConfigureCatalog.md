---
provides:
  - screen:mobile:ConfigureCatalog
needs:
  - schema:taxonomy
  - schema:bundles
dependsOn:
  - design/stories/mobile/01-exploring.md
  - design/stories/mobile/02-daily.md
  - design/stories/mobile/03-configuring.md
  - design/specs/mobile/screens/configure-catalog.md
  - design/specs/mobile/navigation.md
  - design/specs/mobile/global/general.md
  - design/specs/mobile/global/ui.md
  - design/specs/domain/taxonomy.md
  - design/specs/domain/bundles.md
  - design/specs/domain/rules.md
  - design/specs/domain/import-export.md
---

# ConfigureCatalog Screen Consolidation

## Purpose

Manage the catalog (types → categories → items, and bundles) used for logging.
Organized by Type; items grouped into categories. On an empty install, presents the
catalog "get started" path (mirrors LogHistory onboarding).

## Route
- **Route**: `ConfigureCatalog` (Catalog tab root) · **Title**: "Catalog"

## Layout

### Header
- **Left**: "Catalog"
- **Right actions**: Search toggle · **(+) Add** (context-sensitive: Item or Bundle by active view) · overflow menu (**Import catalog**, **Export catalog**, **Show retired** toggle)

### Filter bar (toggleable)
- Input, placeholder "Filter…", clear (×). Per `general.md` filter rules.

### Type selector
- Data-driven from the DB (no hardcoded types). Selecting a Type filters the lists below. Visible only when ≥1 (active) Type exists.

### View toggle
- `Items | Bundles` segmented control for the selected Type.

### Content list (scrollable)
- **Items view**: card = item name · category label · chevron → `EditItem`.
- **Bundles view**: card = bundle icon · name · item count · chevron → `EditBundle`.
- **Active only by default**: lists show only non-retired rows (`retired_at IS NULL`). See Retire below.

### Retire / hide (soft delete)

Per `design/specs/domain/rules.md` and story 03 (Alt Path A): catalog elements carry
`retiredAt` and are **retired**, not hard-deleted, so historical entries stay intact.

- **Retire action** on an item/bundle row (row overflow menu or swipe action) → confirm
  dialog explaining it will be hidden from future logging but history is preserved → sets `retiredAt`.
- Retired rows disappear from the default lists and from logging pickers (EditEntry/EditBundle).
- **Show retired** toggle (overflow menu) reveals retired rows (dimmed, "Retired" chip) with a
  **Restore** action (clears `retiredAt`). Hard delete is reserved for rows with no history and is not surfaced by default.

### Empty states (required)

**No Types yet** (empty catalog — the default first run): "get started" panel, importing a
starter catalog as the **primary** CTA (mirrors LogHistory):
- **Import a starter catalog** (primary) → pick a bundled canonical catalog (Minimal, or Small/Medium/Large with foods) per `general.md`, preview-before-commit.
- **Browse more catalogs online** → opens `https://sereus.org/health/` in the system browser.
- **Create first Type** (via (+) Add, if type CRUD is supported; else guide to import).

**Items empty** (selected Type): "No items yet" → "Add your first {Type} item" · "Browse more catalogs online".
**Bundles empty** (selected Type): "No bundles yet" → "Create a bundle".

### Bottom tab bar
Per `navigation.md`, pinned: Home · Catalog · Assistant · Settings (outline/filled by active).

## Navigation

| Action | Target |
|--------|--------|
| Tap item card | `EditItem` |
| Tap bundle card | `EditBundle` |
| (+) in Items view | `EditItem` (Type pre-selected) |
| (+) in Bundles view | `EditBundle` (Type pre-selected) |
| Overflow → Import catalog | Import flow (canonical YAML/JSON, preview) |
| Tab bar | switch tabs |

## Import / export (data portability)

- **Import catalog** (header/overflow, and empty-state CTA): canonical **YAML/JSON only**
  (`import-export.md` catalog file: `version`, `catalog.{types,categories,items[quantifiers],bundles}`,
  name-referenced). **Preview-before-commit required** — scrollable record list + add/update/skip
  counts + warnings, explicit confirm/cancel. Non-canonical formats (CSV/spreadsheet/image) are
  routed through the **Assistant**, not imported directly.
- **Export catalog**: canonical YAML/JSON round-trip.

## Data shaping

From `db/catalog.ts` / `data/configureCatalog.ts`, **filtered to active** unless "Show retired":

- `types: CatalogType[]` (active)
- `items: CatalogItem[]` (id, name, type, category, `retiredAt?`)
- `bundles: CatalogBundle[]` (id, name, type, itemCount, `retiredAt?`)

## Screen state
`types` · `items` · `bundles` · `selectedType` · `viewMode: 'items'|'bundles'` · `filterText` · `filterVisible` · `showRetired: boolean` · `loading` · `error?`

## Mock variants
- **happy**: multiple types/items/bundles; include ≥1 retired item to exercise the Show-retired toggle.
- **empty**: no types → "get started" onboarding empty state.
- **error**: load failure → retry.

## i18n keys
```
configureCatalog.title: "Catalog"
configureCatalog.filterPlaceholder: "Filter…"
configureCatalog.items: "Items"
configureCatalog.bundles: "Bundles"
configureCatalog.importCatalog: "Import catalog"
configureCatalog.exportCatalog: "Export catalog"
configureCatalog.showRetired: "Show retired"
configureCatalog.retire: "Retire"
configureCatalog.retireConfirmTitle: "Retire {name}?"
configureCatalog.retireConfirmBody: "It will be hidden from future logging. Your existing entries that use it stay unchanged."
configureCatalog.retiredChip: "Retired"
configureCatalog.restore: "Restore"
configureCatalog.emptyNoTypes: "No catalog yet"
configureCatalog.emptyNoTypesMessage: "Import a starter catalog to begin, or create your first type."
configureCatalog.emptyImportStarter: "Import a starter catalog"
configureCatalog.emptyBrowseOnline: "Browse more catalogs online"
configureCatalog.emptyItemsTitle: "No items yet"
configureCatalog.emptyItemsBody: "Add your first {type} item."
configureCatalog.emptyBundlesTitle: "No bundles yet"
configureCatalog.emptyBundlesBody: "Create a bundle to group items together."
configureCatalog.bundleCount: "{count} items"
configureCatalog.errorLoading: "Failed to load catalog."
```

---
**Status**: Regenerated (refresh — retire/hide, catalog import + preview, empty-first-run onboarding, active-only lists)
**Last Updated**: 2026-07-05
