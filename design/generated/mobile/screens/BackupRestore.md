---
provides:
  - screen:mobile:BackupRestore
needs:
  - api:importExport
  - schema:taxonomy
  - schema:logging
dependsOn:
  - design/stories/mobile/09-backup.md
  - design/stories/mobile/06-imp-exp.md
  - design/specs/mobile/screens/backup-restore.md
  - design/specs/domain/import-export.md
  - design/specs/domain/rules.md
  - design/specs/mobile/navigation.md
  - design/specs/mobile/global/general.md
  - design/specs/mobile/global/ui.md
---

# BackupRestore Screen Consolidation

## Purpose

Export a full, **lossless-enough** backup of the user's data and import it later — the
device-migration and disaster-recovery path (story 09). Import is idempotent and preview-first, and
supports both **Merge** and **Replace** intents.

## Route
- **Route**: `BackupRestore` (push from `Settings`) · **Title**: "Backup & Import"

## Layout

### Header
- Back (→ `Settings`) · title "Backup & Import".

### Status (recommended — currently static)
- "Last backup" (timestamp / "Never") and "Modified since last backup". **Shipped as static
  placeholders** (`Never` / `Unknown`); wiring real values (persist `lastBackupAt`, compare a data
  hash/mtime) is an open follow-up. When modified-since is known-true, nudge an export before any
  destructive action (Clear, Replace).

### Export
- **Export backup** (primary CTA).
- Flow (order matters — matches `import-export.md` "Sharing"):
  1. Serialize `exportBackup()` → YAML (`js-yaml`).
  2. **Write to user storage** — Downloads (Android) / Documents (iOS), filename
     `sereus-health-backup-<ISO>.yaml`. **This is the export.**
  3. Show confirmation with the file location, offering an **optional "Share…"** action.
- **Sharing is decoupled and never fails the export.** `react-native-share` rejects when the sheet is
  dismissed ("User did not share") and, on Android, sometimes even after a *successful* share — so the
  share call lives in its own handler (`shareBackupFile`) whose rejection is swallowed (logged at
  debug). A saved-but-not-shared backup is a success, not an error. (This corrects a prior bug where
  the forced inline share turned every non-share into "Export Failed".)

### Import
- **Import backup** (secondary CTA) → OS file picker (YAML/JSON; `plainText`/`text/yaml`/`allFiles`).
- **Preview-before-commit (required)**: parse → `importBackup(data, { dryRun: true })` → Alert with
  **add / update / skip** counts and warning/error count. Then choose:
  - **Merge** (default) — idempotent import into existing data.
  - **Replace…** — **double-confirmed** ("Replace all data? … cannot be undone") → clears all local
    data, then imports.
  - **Cancel**.
- Errors present in the dry-run block the commit and are shown.

### Danger zone (`__DEV__` only)
- **Clear Local Data** → `resetDatabaseForDev()`: a **full nuke** of the optimystic LevelDB stores
  (incl. node identity); requires an app relaunch to re-bootstrap. This is distinct from Replace-mode's
  in-session clear (below) and remains dev-gated.

## What a backup contains (format)

Canonical YAML per `import-export.md` (`data/backup.ts` `BackupData`):

- `version`, `exportedAtUtc`
- `catalog.types[]` — authoritative (from the `types` table)
- `catalog.categories[]` `{typeName, name}` — **queried directly, so empty categories survive**
- `catalog.items[]` `{typeName, categoryName, name, description?, quantifiers[]}` — includes quantifier **definitions** (name/min/max/units)
- `catalog.bundles[]` `{typeName, name, itemNames[]}`
- `logs[]` `{timestampUtc, eventUtcOffsetMinutes?, typeName, items[{categoryName, itemName, quantifiers[{name,value,units?}]}], comment?}` — **originating-zone offset preserved** (per `rules.md` Time) so a restored entry still reads in the zone it was logged in
- `settings` — `{}` for now

**Not yet captured (documented gaps, not blockers):**
- **`retiredAt`** on any entity — retired/hidden items/categories/bundles restore as **active**. (Round-trips the data, loses the hidden flag.)
- **Nested bundles** (`member_bundle_id`) — bundles export as flat `itemNames`.
- **`settings`** — theme + reminders not persisted here yet. **API keys are deliberately excluded** (they live in device secure storage; writing them into a shareable plaintext file would be a security regression).

## Import behavior (`data/backup.ts` `importBackup`)

- **Catalog** reuses the tested **`importCanonicalCatalog`** (idempotent by name identity; creates
  types/categories/items/quantifiers/bundles). Existing rows are skipped (not updated) — safe/idempotent.
- **Logs** imported here:
  - Idempotency key **`(timestampUtc, typeName, set(itemNames))`** (per `import-export.md`); existing → **skip** (value/comment update-on-match is a future refinement).
  - Resolves ids by name: type by name, item by `(type, categoryName, itemName)`, quantifier by `(item, name)`. Unresolved item/quantifier → warning (row/value skipped), never a hard crash.
  - Inserts via `createLogEntry`, passing the backup's `eventUtcOffsetMinutes` so the original zone is retained (not recomputed from the importing device).
- **Replace** (`mode:'replace'`, non-dry-run) calls **`clearAllData()`** first — a **session-safe**
  table-level clear (`db/clear.ts`; child→parent `DELETE FROM` in one transaction, safe on Quereus
  ≥4.3.1), leaving the strand/session alive so the import runs immediately. (Contrast the dev-only nuke.)
- **Partial backups** are allowed — only what's present is applied.
- **Ordering**: catalog before logs, so log item references resolve.

## Data functions
`exportBackup(): BackupData` · `importBackup(data, { mode:'merge'|'replace', dryRun? }): ImportPreview`
(`{catalogItems,bundles,logs}×{Add,Update,Skip}`, `warnings[]`, `errors[]`) · `clearAllData()` (db/clear.ts).

## Idempotency (per import-export.md)
- Catalog item: `(typeName, categoryName, itemName)` · Quantifier: `(item, name)` · Bundle: `(typeName, bundleName)` · Log: `(timestampUtc, typeName, set(items))`.

## Variants (mock)
- **happy**: export writes + confirms (share optional); import preview shows add/update/skip, Merge and Replace both offered.
- **empty**: nothing to export; import into empty DB adds everything.
- **error**: invalid/parse failure → error alert, no write.

## i18n
Existing `backupRestore.*` keys cover the screen. Export/import **Alert** copy (Backup Exported, Share…,
Done, Import Preview, Merge, Replace…, Replace-confirm, Export/Import Failed) is inline English in the
screen, consistent with the file's existing alert style — no new keys required.

---
**Status**: Regenerated — functional restore (logs + bundles + quantifiers), Merge/Replace with session-safe clear, offset-preserving + empty-category export, share decoupled from save. Known gaps: retiredAt, nested bundles, settings, live status.
**Last Updated**: 2026-07-08
