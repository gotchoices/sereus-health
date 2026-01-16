# Import/Export (Data Portability)

This spec defines the **shared, user-observable** data portability contract for Sereus Health.

## What users can export

- **Logs (CSV)**: for sharing and external analysis (filtered or all, depending on the screen).
- **Catalog (canonical)**: for safe round-trip import/export.
- **Backup (canonical)**: for moving a complete local setup between devices.

Canonical exports are **YAML or JSON**.

## Canonical formats (YAML / JSON)

Direct import supports only:

- **YAML**: `.yaml` / `.yml`
- **JSON**: `.json`

All other formats (spreadsheets, screenshots, arbitrary files) are handled via the **assistant**, which converts them into canonical data and proposes a preview/approval plan.

### Canonical: Catalog file

A catalog export contains (names are illustrative; structure is canonical):

- `version` (integer)
- `exportedAtUtc` (ISO8601 string; may be omitted for hand-authored starter catalogs)
- `catalog`
  - `types[]`
  - `categories[]`
  - `items[]` (each may include `quantifiers[]`; may be empty/omitted for starter catalogs)
  - `bundles[]` (with member references; may be empty/omitted for starter catalogs)

### Canonical: Backup file

A backup export contains:

- `version` (integer)
- `exportedAtUtc` (ISO8601 string)
- `catalog` (taxonomy + bundles)
- `logs` (log entries)
- `settings` (may be empty for now)

Imports apply **only what is present** (partial backups are allowed).

## Logs CSV export (stable header)

### Log entries CSV

- **Header**: `timestampUtc,type,category,item,quantifier,value,unit,comment`
- **Model**: one row per *entry × item × quantifier* (entries with multiple items/quantifiers span multiple rows)

Notes:
- CSV is export-only for logs in the MVP; direct CSV import is not part of the contract.

## Import behavior

### Preview-before-commit (required)

Before applying any import, the app shows a preview with:

- A scrollable list showing all records to import
- Summary data at end:
  - counts: **add / update / skip**
  - top warnings/errors (if any)
- explicit user choice: **confirm** or **cancel**

### Backup import modes

For **backup** imports, the app supports two user-intent modes:

- **Merge (default)**: idempotent import into existing local data (safe to re-run; does not duplicate).
- **Replace (optional)**: clear local data first, then import (device matches the backup more closely).

### Idempotency / matching rules

Imports must be idempotent (re-importing does not multiply data).

- **String matching**: comparisons for user-defined names follow `rules.md` (case sensitivity / normalization policy).
- **Catalog item identity**: `(typeName, categoryName, itemName)`
- **Quantifier definition identity**: `(itemIdentity, quantifierName)`
- **Bundle identity**: `(typeName, bundleName)`
- **Log entry identity (MVP)**: `(timestampUtc, typeName, set(items))`
  - When a match exists, import **updates** differing values/comments rather than creating duplicates.

### Missing taxonomy during log import

If an imported log references unknown types/categories/items, import must make the outcome explicit in the preview:

- either **create missing taxonomy** needed to represent the logs, or
- **skip** the affected rows with clear warnings.

## Errors

- Invalid format: show an error and abort.
- Partial success: show a summary (added/updated/skipped + failures) with the top reasons.

## Sharing / where exported files go

After export:

1. **Save to user-accessible storage** (Downloads on Android, Documents on iOS)
2. **Then** offer the system share sheet (cloud providers, email, etc.)
3. Show confirmation with file location

Rationale: users expect “export” to mean “saved to my device,” not “temporarily cached until shared.”
