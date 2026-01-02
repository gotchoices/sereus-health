# BackupRestore Screen Spec

## Purpose

Allow the user to export a full backup of their data and restore it later (e.g., when switching phones).

## Behaviors

- **Export backup**: exports a full backup file (YAML) as defined in `design/specs/api/import-export.md` and offers the system share sheet.
- **Import/restore**: selects a backup file and restores what is present, per `design/specs/api/import-export.md`.

## Status & guardrails (recommended)

- Display basic status:
  - **Last backup**: timestamp (or “Never”).
  - **Modified since last backup**: yes/no.
- Before **restore** or **reset**, if the DB is modified since last backup, the UI should strongly encourage an export first (or require an explicit acknowledgement).

## Notes

- The import flow must be idempotent and should not multiply data across repeated imports.
- **Reset DB (dev-only)**: place a destructive “Reset DB (dev)” action here (danger zone), not on the Settings root.


