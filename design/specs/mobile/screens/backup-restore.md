# BackupRestore Screen Spec

## Purpose

Allow the user to export a full backup of their data and import it later (e.g., when switching phones).

## Behaviors

- **Export backup**: exports a full backup file (YAML) as defined in `design/specs/domain/import-export.md`.
- **Import backup**: selects a backup file and imports what is present, per `design/specs/domain/import-export.md`.
  - Import must be **idempotent** (re-import does not duplicate).
  - Import should support **Merge (default)** and an optional **Replace (clear-first)** mode for full backups.

## Status & guardrails (recommended)

- Display basic status:
  - **Last backup**: timestamp (or “Never”).
  - **Modified since last backup**: yes/no.
- Before **import (replace)** or **clear local data**, if the DB is modified since last backup, the UI should strongly encourage an export first (or require an explicit acknowledgement).

## Notes

- The import flow must be idempotent and should not multiply data across repeated imports.
- **Clear local data** (destructive): place this action here (danger zone), not on the Settings root.


