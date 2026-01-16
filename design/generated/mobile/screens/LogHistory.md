---
provides:
  - screen:mobile:LogHistory
needs:
  - schema:taxonomy
  - schema:logging
dependsOn:
  - design/stories/mobile/01-exploring.md
  - design/stories/mobile/02-daily.md
  - design/stories/mobile/04-cloning.md
  - design/specs/mobile/screens/log-history.md
  - design/specs/mobile/navigation.md
  - design/specs/mobile/global/general.md
  - design/specs/mobile/global/ui.md
  - design/specs/domain/taxonomy.md
  - design/specs/domain/logging.md
  - design/specs/domain/import-export.md
---

# LogHistory Screen Consolidation

## Purpose

Primary home screen: show a chronological list of log entries and provide fast access to:

- Add a new entry
- Clone an entry
- Open graphs
- Filter/search within history
- Export logs

## Route

- **Route**: `LogHistory` (Home tab root)
- **Title**: "History"

## Layout

### Header

- **Left**: App logo + "History" title
- **Right actions** (left to right):
  - Graph icon → navigate to Graphs
  - Search/filter toggle icon
  - (+) Add new entry (primary action, accent color)

### Filter bar (toggleable)

- Text input with search icon, placeholder "Filter entries..."
- Clear button (×) when text present
- Follows `general.md` filter rules: hidden retains value but does not filter

### Entry list (scrollable)

Reverse chronological (newest first).

### Entry card (compact 3-line layout)

- **Line 1 (header row)**:
  - Type badge (colored pill: Activity/Condition/Outcome)
  - Timestamp (local display, right of badge)
  - Clone icon (far right, comfortable touch target via hitSlop)
- **Line 2**: Item/bundle names comma-separated; truncate after 3 with "+N more"
- **Line 3 (optional)**: Comment snippet, single line, italic

**Spacing (dense list)**:

- Card padding: 12px
- Line spacing: 4px
- Card margin-bottom: 8px
- Clone touch target: ≥44pt

### Empty state (required)

When there are no log entries, show:

- "No entries yet"
- **Get started** CTAs:
  - **Import minimal starter categories (built-in)** → triggers built-in catalog import (`general.md`)
  - **Browse more catalogs (online)** → opens `health.sereus.org` in system browser (`general.md`)
  - **Create your first entry** → navigate to EditEntry (mode=new)

### Bottom tab bar

Per `navigation.md`, 4 tabs (left → right):

| Tab       | Icon (Ionicons)                       | Active state      |
| --------- | ------------------------------------- | ----------------- |
| Home      | `home` / `home-outline`               | filled when active|
| Catalog   | `list` / `list-outline`               | filled when active|
| Assistant | `sparkles` / `sparkles-outline`       | filled when active|
| Settings  | `settings` / `settings-outline`       | filled when active|

Tab bar is pinned at bottom; content scrolls above it.

## Navigation

- **Add (+)** → `EditEntry` (mode=new)
- **Clone icon** → `EditEntry` (mode=clone, entryId)
- **Tap card** → `EditEntry` (mode=edit, entryId)
- **Graph icon** → `Graphs`
- **Tab bar** → switch tabs (Home, Catalog, Assistant, Settings)

Back behavior: at Home tab root, Android back exits app.

## Data shaping

LogHistory needs a summary per entry:

- `id: string`
- `timestampUtc: string` (ISO 8601, display in local)
- `type: string`
- `items: string[]` (names)
- `bundles: string[]` (names)
- `comment?: string`

## Screen state

- `entries: LogEntry[]`
- `filterText: string`
- `filterVisible: boolean`
- `loading: boolean`
- `error?: string`

## Export (data portability)

- Expose **Export logs** action (header menu or dedicated button).
- Export supports filtered subset (if filter active) or all entries.
- Format: CSV per `import-export.md`.

## Mock variants

- **happy**: 10–15 diverse entries, mix of types/items/bundles/quantifiers/comments
- **empty**: Zero entries; shows empty state with CTAs
- **error**: Data loading failure; shows error message with retry

## i18n keys

```
logHistory.title: "History"
logHistory.addNew: "Add new entry"
logHistory.openGraphs: "Open graphs"
logHistory.filterPlaceholder: "Filter entries..."
logHistory.clearFilter: "Clear filter"
logHistory.clone: "Clone entry"
logHistory.emptyTitle: "No entries yet"
logHistory.emptyMessage: "Get started by importing a catalog or creating your first entry."
logHistory.emptyImportBuiltin: "Import minimal starter categories"
logHistory.emptyBrowseOnline: "Browse more catalogs online"
logHistory.emptyCreateFirst: "Create your first entry"
logHistory.errorLoading: "Failed to load entries"
logHistory.retry: "Retry"
logHistory.itemsMore: "+{count} more"
navigation.home: "Home"
navigation.catalog: "Catalog"
navigation.assistant: "Assistant"
navigation.settings: "Settings"
```

---

**Status**: Fresh consolidation
**Last Updated**: 2026-01-16
