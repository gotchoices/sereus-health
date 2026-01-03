---
provides:
  - screen:mobile:BackupRestore
needs:
  - api:importExport
dependsOn:
  - design/stories/mobile/09-backup.md
  - design/specs/mobile/screens/backup-restore.md
  - design/specs/api/import-export.md
  - design/specs/mobile/navigation.md
  - design/specs/mobile/global/general.md
  - design/specs/mobile/global/ui.md
---

# BackupRestore Screen Consolidation

## Purpose

Allow the user to export a full backup of their data and import it later (e.g., when switching phones or after device reset).

## Screen Identity

- **Route**: `BackupRestore` (push from `Settings`)
- **Title**: "Backup & Import"
- **Deep Link**: `health://screen/BackupRestore?variant={happy|empty|error}`

## User Journey Context

From stories:
- **09-backup.md**: Bob exports a full backup to keep it safe in cloud storage. Later, when he gets a new phone, he imports his backup file and all his data is back.

## Layout & Information Architecture

### Header
- **Title**: "Backup & Import"
- **Back Button**: Returns to `Settings`

### Main Content Area

#### Status Section (recommended)

Display basic backup status:
- **Last backup**: timestamp (formatted to locale) or "Never"
- **Modified since last backup**: yes/no indicator
  - If "yes", show a gentle reminder to export before performing destructive actions (clear, replace-mode import)

#### Export Section

**Export Backup**
- Button: prominent, primary style
- Action: exports a full YAML backup file per `design/specs/api/import-export.md`
- After export:
  1. Save to user-accessible storage (Downloads on Android, Documents on iOS)
  2. Offer system share sheet (cloud providers, email, etc.)
  3. Show confirmation with file location
- Rationale: Story 09 shows Bob exporting and saving to cloud storage

#### Import Section

**Import Backup**
- Button: secondary style
- Action: opens system file picker to select a backup file (YAML/CSV/JSON)
- **Preview-before-commit flow**:
  1. Parse file and detect format
  2. Show preview: counts (add/update/skip), any errors/warnings
  3. Offer import mode choice for full backups:
     - **Merge (default)**: idempotent import into existing data (safe)
     - **Replace**: clear local data first, then import (stronger guarantee of matching backup state)
  4. User confirms or cancels
  5. If confirmed, apply import
  6. Show summary (added/updated/skipped + any failures)
- Must be idempotent per `design/specs/api/import-export.md`
- Rationale: Story 09 shows Alice importing Bob's catalog without duplicates, and Bob re-importing on a new phone

#### Danger Zone (dev-only or explicit user action)

**Clear Local Data** (destructive)
- Button: danger/destructive style (red border/text)
- Action: deletes all local database files (not just "reset to defaults", but fully wipe)
- Confirmation: "This will delete all your data. Continue?"
- Before allowing: if DB is modified since last backup, strongly encourage export first
- After clear: "Done. Fully close and relaunch the app to re-seed."
- Placement: Separated visually (danger zone section), not on Settings root
- Note: This replaces "Reset DB (dev)" and becomes a real user-facing feature if desired (or keep dev-only with `__DEV__` gate)

### Bottom Navigation (Tab Bar)

No bottom tabs on this screen (it's a pushed screen, not a tab root).

## Navigation

- **Back to**: `Settings` (pop)
- **No forward navigation** (terminal screen in this stack)

## Data Shaping Notes

BackupRestore interacts with:
- **Backup status metadata** (app config or separate table):
  - `lastBackupAt` (timestamp or null)
  - `modifiedSinceBackup` (boolean)
- **Export/import logic**:
  - See `design/specs/api/import-export.md` for YAML contracts and idempotency rules
  - Import must detect format (CSV/YAML/JSON) and parse accordingly
  - Import preview requires a "dry-run" pass over the data

## Required i18n Keys

- `backupRestore.title` — "Backup & Import"
- `backupRestore.statusTitle` — "Status"
- `backupRestore.statusLastBackupNever` — "Last backup: Never"
- `backupRestore.statusLastBackupAt` — "Last backup: {date}"
- `backupRestore.statusModifiedYes` — "Modified since last backup: Yes"
- `backupRestore.statusModifiedNo` — "Modified since last backup: No"
- `backupRestore.statusModifiedUnknown` — "Modified since last backup: Unknown"
- `backupRestore.export` — "Export Backup"
- `backupRestore.import` — "Import Backup"
- `backupRestore.importModeTitle` — "Import Mode"
- `backupRestore.importModeMerge` — "Merge (safe)"
- `backupRestore.importModeReplace` — "Replace (clear first)"
- `backupRestore.previewTitle` — "Import Preview"
- `backupRestore.previewAdd` — "Add: {count}"
- `backupRestore.previewUpdate` — "Update: {count}"
- `backupRestore.previewSkip` — "Skip: {count}"
- `backupRestore.previewConfirm` — "Confirm Import"
- `backupRestore.dangerZone` — "Danger zone"
- `backupRestore.clearData` — "Clear Local Data"
- `backupRestore.clearDataTitle` — "Clear Local Data"
- `backupRestore.clearDataConfirm` — "This will delete all your data. Continue?"
- `backupRestore.clearDataAction` — "Clear"
- `backupRestore.clearDataDone` — "Done. Fully close and relaunch the app."
- `backupRestore.clearDataFailed` — "Failed. See logs for details."
- `common.cancel` — "Cancel"
- `common.notImplementedTitle` — "Not Implemented"
- `common.notImplementedBody` — "This feature is coming soon."

## UI Notes

- Status section uses faded/secondary text for metadata
- Export/Import buttons are full-width or prominent CTAs
- "Clear Local Data" is visually separated (danger zone), with destructive styling (red border/text)
- Import preview dialog/modal shows counts and errors before user commits
- Confirmation dialogs follow platform conventions (Alert on RN)

## Variants (mock data)

- **happy** (default): Status shows "Last backup: 2 days ago", modified=no; import succeeds with preview
- **empty**: Status shows "Last backup: Never", modified=unknown; import works but no existing data to merge
- **error**: Import fails with parse error or invalid format
