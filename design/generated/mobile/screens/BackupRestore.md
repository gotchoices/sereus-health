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

Allow the user to export a full backup of their data and restore it later (e.g., when switching phones or for data portability).

## Screen Identity

- **Route**: `BackupRestore` (push from `Settings`)
- **Title**: "Backup & Restore"
- **Deep Link**: `health://screen/BackupRestore?variant={happy|empty|error}`

## User Journey Context

From stories:
- **09-backup.md**: Bob is switching phones and needs to export his health data, then import it on the new device. He expects idempotent import (re-importing the same backup should not duplicate entries).

## Layout & Information Architecture

### Header
- **Title**: "Backup & Restore"
- **Back Button**: Returns to `Settings`

### Main Content Area

#### Status Section (recommended)

Display basic backup status:
- **Last backup**: timestamp (formatted to locale) or "Never"
- **Modified since last backup**: yes/no indicator
  - If "yes", show a gentle reminder to export before restore/reset

#### Actions Section

1. **Export Backup**
   - Button: prominent, primary style
   - Action: exports a full YAML backup file per `design/specs/api/import-export.md`
   - After export, offer the system share sheet (Files, cloud providers, email, etc.)
   - Rationale: Story 09 shows Bob exporting before switching phones

2. **Import / Restore**
   - Button: secondary style
   - Action: opens system file picker to select a backup file (CSV/YAML/JSON)
   - Preview-before-commit:
     - Show counts: add / update / skip
     - Show top errors/warnings (if any)
     - User can confirm or cancel
   - Must be idempotent per `design/specs/api/import-export.md`
   - Rationale: Story 09 shows Bob importing on the new device

#### Danger Zone (dev-only, `__DEV__` gated)

3. **Reset DB (dev)**
   - Button: destructive/danger style
   - Action: deletes all local database files
   - Confirmation: "This will delete all local database files. Continue?"
   - After reset: "Done. Fully close and relaunch the app to re-seed."
   - Rationale: Moved from Settings root per spec

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
  - See `design/specs/api/import-export.md` for YAML contract and idempotency rules
  - Import must detect format (CSV/YAML/JSON) and call appropriate parser

## Required i18n Keys

- `backupRestore.title` — "Backup & Restore"
- `backupRestore.statusTitle` — "Status"
- `backupRestore.statusLastBackupNever` — "Last backup: Never"
- `backupRestore.statusModifiedUnknown` — "Modified since last backup: Unknown"
- `backupRestore.export` — "Export Backup"
- `backupRestore.import` — "Import / Restore"
- `backupRestore.dangerZone` — "Danger zone (dev)"
- `backupRestore.resetDbDev` — "Reset DB (dev)"
- `backupRestore.resetDbTitle` — "Reset DB"
- `backupRestore.resetDbConfirm` — "This will delete all local database files. Continue?"
- `backupRestore.resetDbAction` — "Reset"
- `backupRestore.resetDbDone` — "Done. Fully close and relaunch the app to re-seed."
- `backupRestore.resetDbFailed` — "Failed. See logs for details."
- `common.cancel` — "Cancel"

## UI Notes

- Status section uses faded/secondary text for metadata
- Export/Import buttons are full-width or prominent CTAs
- Dev-only "Reset DB" is visually separated (danger zone), with destructive styling (red border/text)
- Confirmation dialogs follow platform conventions (Alert on RN)

## Variants (mock data)

- **happy** (default): Status shows "Last backup: 2 days ago", modified=no
- **empty**: Status shows "Last backup: Never", modified=unknown
- **error**: (No data errors on this screen; export/import errors are inline)

