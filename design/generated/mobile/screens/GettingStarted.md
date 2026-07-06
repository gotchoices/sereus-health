---
provides:
  - screen:mobile:GettingStarted
needs:
  - schema:taxonomy
dependsOn:
  - design/stories/mobile/01-exploring.md
  - design/specs/mobile/global/general.md
  - design/specs/domain/import-export.md
  - design/specs/domain/taxonomy.md
---

# GettingStarted (Onboarding) Screen Consolidation

## Purpose

First-run onboarding shown when the catalog is empty (no Types). Makes the three
setup paths from story `01-exploring.md` obvious and actionable. Not a tab; it is
gated in `App.tsx` on `getTypeCount() === 0` and replaces the normal shell until the
user imports a catalog or chooses to start by hand.

## Trigger / gate

- On launch: `ensureDatabaseInitialized()` → `getTypeCount()`. If `0`, render GettingStarted.
- Also re-entered from the LogHistory / ConfigureCatalog empty-state "Import a starter catalog" CTA.

## Layout

**Home view** — logo, welcome (`gettingStarted.welcomeTitle/Body`), and three option cards:

1. **Import from sereus.org** (`cloud-download-outline`) → opens the online view.
2. **Import from a file** (`document-outline`) → OS file picker (`@react-native-documents/picker`),
   reads the chosen `.yaml`/`.yml`/`.json`, parses, previews.
3. **Start from scratch** (`create-outline`) → dismiss onboarding; land on the Catalog tab to build by hand.

**Online view** — fetches `https://sereus.org/health/catalogs/index.json` and lists the published
catalogs (**Minimal / Small / Medium / Large**) with item/category counts; tap one to import.
Loading spinner; on failure, a clear message + Retry (and the file/scratch paths still work).

## Behavior — preview before commit (required, `import-export.md`)

All three sources funnel through: **load → `previewCatalogImport` (dry-run) → confirm dialog with
add/skip counts + warnings → `commitCatalogImport` (transactional)**. Import is **idempotent**
(existing types/categories/items are reused, not duplicated). On success, a "Catalog imported"
confirmation → `onDone` (land on Home).

> Note: MVP preview is a counts summary (Add N types / N categories / N items; already-present skips;
> warnings). A scrollable per-record preview list is a future refinement.

## Data / adapters

- `data/catalogImport.ts`: `fetchCatalogIndex()`, `fetchCatalog(file)`, `pickAndParseCatalogFile()`,
  `parseCatalog(text)`, `previewCatalogImport()`, `commitCatalogImport()`, `getTypeCount()`.
- `db/catalog.ts`: `importCanonicalCatalog(cat, { dryRun })` — the idempotent upsert.
- Catalog source is **fetched, not bundled** (`general.md`); `sereus.org/health` is the source of truth.

## Navigation

- `onDone` → dismiss onboarding, reset to Home (`LogHistory`).
- `onStartScratch` → dismiss onboarding, reset to Catalog (`ConfigureCatalog`) to add the first item.

## Mock variants
- **happy**: online index returns Minimal/Small/Medium/Large.
- **empty**: index reachable but zero catalogs (unlikely) → show file/scratch only.
- **error**: index fetch fails → error + Retry; file/scratch still available.

## i18n keys
```
gettingStarted.welcomeTitle / welcomeBody
gettingStarted.onlineTitle / onlineBody / onlineHeading / onlineLoadFailed / catalogMeta
gettingStarted.fileTitle / fileBody
gettingStarted.scratchTitle / scratchBody
gettingStarted.previewTitle / previewCounts / previewSkip / previewWarnings
gettingStarted.import / doneTitle / doneBody / importFailed
common.back / common.retry / common.cancel / common.done
```

---
**Status**: Generated (new) — implements story 01 onboarding (fetch model, 3 paths, preview-before-commit)
**Last Updated**: 2026-07-05
