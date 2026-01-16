# BackupRestore Screen Spec

## Purpose

Allow the user to export a full backup of their data, clear local data, and import a backup later (e.g., when switching phones).

## Layout

- Header: title “Backup & Import”
- Primary actions:
  - **Export backup**
  - **Import backup**
- Danger zone:
  - **Clear local data** (destructive)

## Export backup

- Exports a full backup file as defined in `design/specs/domain/import-export.md`.
- Export format: canonical **YAML or JSON**.
- After export:
  - Save to user-accessible storage (Downloads on Android, Documents on iOS).
  - Then offer the system share sheet.
  - Show confirmation with file location.

## Import backup

- User selects a canonical backup file (YAML/JSON) and imports what is present, per `design/specs/domain/import-export.md`.
- Import must be **idempotent** (re-import does not duplicate).
- Preview-before-commit is required:
  - Show a scrollable list of records to be imported
  - Show summary counts (add / update / skip) and top warnings/errors
  - User can confirm or cancel

### Import mode

- **Merge (default)**: idempotent import into existing local data.
- **Replace (optional)**: clear local data first, then import.

## Clear local data (destructive)

- Clears the local database so it is truly empty (no reseed).
- Requires explicit confirmation.
- If “modified since last backup” is true, the UI should strongly encourage an export first (or require an explicit acknowledgement).

## Status & guardrails (recommended)

- Display basic status:
  - **Last backup**: timestamp (or “Never”)
  - **Modified since last backup**: yes/no


