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
  - design/specs/domain/import-export.md
---

# ConfigureCatalog Screen Consolidation

## Purpose

Manage the catalog of items, categories, and bundles used for logging. The catalog is organized by Type, with items grouped into categories.

## Route

- **Route**: `ConfigureCatalog` (Catalog tab root)
- **Title**: "Catalog"

## Layout

### Header

- **Left**: Title "Catalog"
- **Right actions**:
  - Search toggle icon
  - (+) Add (context-sensitive: adds Item or Bundle based on active view)
  - (Optional) overflow menu for Import/Export

### Filter bar (toggleable)

- Text input with search icon, placeholder "Filter…"
- Clear button (×) when text present
- Follows `general.md` filter rules

### Type selector

- Shows available Types from database (data-driven, not hardcoded)
- Selecting a Type filters Items/Bundles below
- Only visible when at least one Type exists

### View toggle

- `Items | Bundles` segmented control
- Switches between Items view and Bundles view for the selected Type

### Content list (scrollable)

**Items view**:
- Each card: item name, category label, chevron
- Tap → `EditItem`

**Bundles view**:
- Each card: bundle icon, bundle name, item count, chevron
- Tap → `EditBundle`

### Empty states (required)

**No Types yet** (catalog is truly empty):

- Show "Get started" panel with CTAs:
  - **Import minimal starter categories (built-in)** → triggers built-in catalog import (`general.md`)
  - **Browse more catalogs (online)** → opens `health.sereus.org` in system browser (`general.md`)
  - **Create first Type** (if supported; otherwise guide to add via import)

**Items empty** (for selected Type):

- "No items yet"
- CTAs:
  - "Add your first [Type] item"
  - "Browse more catalogs (online)"

**Bundles empty** (for selected Type):

- "No bundles yet"
- CTA: "Create a bundle"

### Bottom tab bar

Per `navigation.md`, 4 tabs (left → right):

| Tab       | Icon (Ionicons)                       | Active state      |
| --------- | ------------------------------------- | ----------------- |
| Home      | `home` / `home-outline`               | filled when active|
| Catalog   | `list` / `list-outline`               | filled when active|
| Assistant | `sparkles` / `sparkles-outline`       | filled when active|
| Settings  | `settings` / `settings-outline`       | filled when active|

## Navigation

| Action | Target |
|--------|--------|
| Tap item card | `EditItem` |
| Tap bundle card | `EditBundle` |
| (+) in Items view | `EditItem` (Type pre-selected) |
| (+) in Bundles view | `EditBundle` (Type pre-selected) |
| Tab bar | switch tabs |

## Data shaping

ConfigureCatalog needs:

- `types: CatalogType[]` (from database, not hardcoded)
- `items: CatalogItem[]` (id, name, type, category)
- `bundles: CatalogBundle[]` (id, name, type, itemCount)

## Screen state

- `types: CatalogType[]`
- `items: CatalogItem[]`
- `bundles: CatalogBundle[]`
- `selectedType: CatalogType | null`
- `viewMode: 'items' | 'bundles'`
- `filterText: string`
- `filterVisible: boolean`
- `loading: boolean`
- `error?: string`

## Import / Export

- ConfigureCatalog exposes **Import Catalog** and **Export Catalog** actions
- Formats per `import-export.md`

## Mock variants

- **happy**: Multiple types, items, bundles
- **empty**: No types at all; shows "Get started" empty state
- **error**: Load failure; shows error with retry

## i18n keys

```
configureCatalog.title: "Catalog"
configureCatalog.filterPlaceholder: "Filter…"
configureCatalog.items: "Items"
configureCatalog.bundles: "Bundles"
configureCatalog.emptyNoTypes: "No catalog yet"
configureCatalog.emptyNoTypesMessage: "Get started by importing a catalog or creating your first type."
configureCatalog.emptyImportBuiltin: "Import minimal starter categories"
configureCatalog.emptyBrowseOnline: "Browse more catalogs online"
configureCatalog.emptyItemsTitle: "No items yet"
configureCatalog.emptyItemsBody: "Add your first {type} item."
configureCatalog.emptyBundlesTitle: "No bundles yet"
configureCatalog.emptyBundlesBody: "Create a bundle to group items together."
configureCatalog.bundleCount: "{count} items"
configureCatalog.errorLoading: "Failed to load catalog."
```

---

**Status**: Fresh consolidation
**Last Updated**: 2026-01-16
