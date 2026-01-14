# Import/Export (Data Portability)

This spec defines the **cross-app** data portability contract for Sereus Health.

Screen-specific placement and UI affordances belong in the relevant screen specs (e.g., LogHistory, ConfigureCatalog, BackupRestore).

## Supported exports

- **Log export**: CSV (scope depends on the screen: filtered subset vs all)
- **Catalog export**: YAML (full taxonomy + quantifier definitions + bundles)
- **Backup export**: YAML (everything: catalog + logs + settings)

## CSV contracts (stable headers)

### Log entries CSV

- **Header**: `timestampUtc,type,category,item,quantifier,value,unit,comment`
- **Model**: one row per *entry × item × quantifier* (entries with multiple items/quantifiers span multiple rows)

### Catalog CSV

Catalog CSV is **not the primary portability format** (YAML is), because CSV is an awkward fit for nested catalog structures (bundles, per-item quantifiers) and versioning.

If/when we add a catalog CSV export, it is intended for **external analysis/editing** rather than perfect round-trip import fidelity.

If implemented:
- **Header**: `type,category,item,quantifierName,quantifierUnit,quantifierMin,quantifierMax`
- **Model**: one row per *item × quantifier*; items without quantifiers have empty quantifier columns

## Catalog contract (YAML)

Catalog YAML is the canonical, round-trippable catalog portability format.

- File contains:
  - `version` (integer)
  - `exportedAtUtc` (ISO8601)
  - `catalog`:
    - `types[]`
    - `categories[]`
    - `items[]` (with optional `quantifiers[]`)
    - `bundles[]` (with members)

## Backup contract (YAML)

- Backup file contains:
  - `version` (integer)
  - `exportedAtUtc` (ISO8601)
  - `catalog` (taxonomy + bundles)
  - `logs` (log entries)
  - `settings` (app settings; may be empty for now)
- Import should apply **only what is present** (partial backups are allowed).

## Import behavior (all formats)

- **Format detection**: by file extension (csv/yaml/yml/json). Reject unknown.
- **Preview** before commit:
  - counts: add / update / skip
  - top errors/warnings (if any)
  - user can confirm or cancel

### Import modes (backup)

For **full backup** imports, the app should support two user-intent modes:

- **Merge (default)**: idempotent import into existing local data (safe to re-run; does not duplicate).
- **Replace (optional)**: clear local data first, then import (so the device matches the backup more closely).

### Idempotency / matching rules

Imports should be idempotent (re-importing should not multiply data).

- **Catalog item identity**: `(typeName, categoryName, itemName)` case-insensitive
- **Quantifier definition identity**: `(itemIdentity, quantifierName)` case-insensitive
- **Bundle identity**: `(typeName, bundleName)` case-insensitive
- **Log entry identity** (MVP): `(timestampUtc, typeName, set(items))`
  - If a match exists, update differing quantifier values/comments rather than creating duplicates.

### Missing taxonomy during log import

- If an imported log references unknown types/categories/items, the importer may create the missing taxonomy definitions (or present a warning and skip those rows). The import preview should make this explicit.

## Error handling

- Invalid format / missing required columns: show error and abort.
- Partial success: show a summary (added/updated/skipped + failures).

## Sharing

After export:
1. **Save to user-accessible storage** (Downloads on Android, Documents on iOS)
2. **Then** offer the system share sheet (cloud providers, email, etc.)
3. Show confirmation with file location

Rationale: Users expect "export" to mean "save to my device", not just "temporarily cached until shared elsewhere". User always has a local copy, even if they cancel the share.


