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
  - design/specs/domain/rules.md
  - design/specs/domain/import-export.md
---

# LogHistory Screen Consolidation

## Purpose

Primary home screen: a chronological view of log entries, with fast access to add,
clone, graph, filter/search, and export. On a fresh (empty) install this screen is
also the **onboarding surface** — it presents the "get started" path.

## Route

- **Route**: `LogHistory` (Home tab root) · **Title**: "History"

## Layout

### Header
- **Left**: app logo + "History"
- **Right actions** (l→r): Graph icon → `Graphs`; Search/filter toggle; **(+) Add** (primary, accent)

### Filter bar (toggleable)
- Search input, placeholder "Filter entries…", clear (×) when non-empty.
- Follows `general.md` filter rules: hiding retains the value but stops filtering; re-opening re-applies.

### Entry list (scrollable, newest first)

Best practice (within the "newest first" spec): **group entries under day headers**
(sticky) by the entry's *originating-local date* — see timestamp rule below. Pull-to-refresh reloads.

**Entry card (compact, 3 lines):**
- **Line 1**: Type badge (Activity/Condition/Outcome, semantic color) · timestamp (see rule) · clone icon (far right, ≥44pt hitSlop)
- **Line 2**: item names, comma-separated; truncate after 3 → "+N more"
- **Line 3 (optional)**: comment snippet, single line, italic

Dense spacing: card padding 12 · line spacing 4 · card margin-bottom 8.

### Timestamp display — originating zone

Per `design/specs/domain/rules.md` (Time), render each entry in the **zone it was
logged in** (from `eventUtcOffsetMinutes`; local = UTC + offset) — **not** the viewer's
current device zone — so a lunch logged in Paris always reads as midday even when
viewed elsewhere. When an entry's offset differs from the device's current offset,
show a subtle zone hint (e.g. "UTC+2") so the user can tell where they were
(story 02-daily, Alt Path B). Day-header grouping uses the originating-local date.

> ⚠ **Spec reconciliation needed (human specs):** `screens/log-history.md` and
> `global/general.md` currently say "timestamp (local display)" / "display in the
> device's local timezone". Domain `rules.md` was updated to **originating-zone**.
> The two mobile specs should be updated to match (pending user approval).

### Empty state (catalog-aware, required)

The empty state depends on **why** there are no entries:

- **Catalog is empty** (no Types — a fresh install before any import): "Set up your catalog" with an
  **Import a starter catalog** CTA that opens onboarding (GettingStarted: import from sereus.org / from a
  file / start by hand). This case is normally pre-empted by the app's first-run onboarding gate, but is
  reachable via "start from scratch" → Home.
- **Catalog present, no entries yet** (the usual case after importing): "No entries yet — tap + to log your
  first activity, condition, or outcome," with a single **Create your first entry** → `EditEntry` (mode=new).

The screen loads `getTypeCount()` alongside history to decide which to show. (No import/browse prompts once a
catalog exists — that was a prior bug.)

### Bottom tab bar
Per `navigation.md`, pinned: Home (`home`), Catalog (`list`), Assistant (`sparkles`), Settings (`settings`) — outline/filled by active state; content scrolls above it.

## Navigation

- **(+)** → `EditEntry` (new) · **Clone** → `EditEntry` (clone, entryId) · **Tap card** → `EditEntry` (edit, entryId)
- **Graph** → `Graphs` · **Tabs** → switch. At Home root, Android back exits.

## Data shaping

Per-entry summary (from `db/logEntries.ts` `getAllLogEntries`):

- `id: string`
- `timestamp: string` — ISO-8601 UTC instant (stored as `datetime`; the boundary converts)
- `eventUtcOffsetMinutes?: number | null` — originating-zone offset for display
- `type: string` · `items: string[]` · `bundles?: string[]` (source-bundle names) · `comment?: string`

## Screen state
`entries` · `filterText` · `filterVisible` · `loading` · `error?`

## Export / import (data portability)
- **Export logs** action (header/menu): filtered subset (if filtering) or all; **CSV** per `import-export.md`
  (header `timestampUtc,type,category,item,quantifier,value,unit,comment`).
- If **Import logs** is exposed here: canonical **YAML/JSON only** (no direct CSV import), preview-before-commit.

## Mock variants
- **happy**: 10–15 diverse entries across types/items/bundles/quantifiers/comments; include ≥1 entry with a differing `eventUtcOffsetMinutes` to exercise the zone hint.
- **empty**: zero entries → onboarding empty state with CTAs.
- **error**: load failure → message + retry.

## i18n keys
```
logHistory.title: "History"
logHistory.addNew: "Add new entry"
logHistory.openGraphs: "Open graphs"
logHistory.filterPlaceholder: "Filter entries…"
logHistory.clearFilter: "Clear filter"
logHistory.clone: "Clone entry"
logHistory.emptyTitle: "No entries yet"
logHistory.emptyNoEntriesMessage: "Tap + to log your first activity, condition, or outcome."
logHistory.emptyCatalogTitle: "Set up your catalog"
logHistory.emptyCatalogMessage: "Import a starter catalog to start logging."
logHistory.emptyImportBuiltin: "Import a starter catalog"
logHistory.emptyCreateFirst: "Create your first entry"
logHistory.errorLoading: "Failed to load entries"
logHistory.retry: "Retry"
logHistory.itemsMore: "+{count} more"
logHistory.zoneHint: "UTC{offset}"
```

---
**Status**: Regenerated (refresh — empty-first-run, originating-zone timestamps, real online catalogs, day grouping)
**Last Updated**: 2026-07-05
