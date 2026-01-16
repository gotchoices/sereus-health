---
id: logging
name: Logging
description: Log entries, logged items, and recorded quantifier values (bundle expansion at log-time).
---

This covers the data model for what the user actually logs over time.

## Bundle expansion (key semantic rule)

When a user logs a Bundle, the system **expands** it into its member Items at log-time and stores those Items on the entry. This preserves historical accuracy if the bundle definition changes later.

Implications:

- Historical entries should not “change” when a bundle definition changes.
- Entries may retain an optional **source bundle** reference for UI grouping, but the logged facts are the Items.

## Entities

### LogEntry (`log_entries`)

One entry at a point in time, containing 0–N items and optional notes.

#### Fields

| Field | Type | Nullable | Description |
|------|------|----------|-------------|
| id | UUID | no | Stable identifier |
| typeId | UUID | no | Entry’s Type (single-type rule) |
| timestampUtc | ISO8601 | no | Stored in UTC; user-editable |
| comment | string | yes | Optional free-form note |

#### Relationships

- LogEntry belongs to Type
- LogEntry has many LoggedItems
- LogEntry has many QuantifierValues

#### Validation / Constraints

- **Single-type rule**: all LoggedItems in the entry must be for the same Type as `typeId`.
- **Items optional**: an entry may have 0 items (comment-only “note” entry).

---

### LoggedItem (`log_entry_items`)

An Item present in a LogEntry. Bundles do **not** appear here as bundle references—only Items.

#### Fields

| Field | Type | Nullable | Description |
|------|------|----------|-------------|
| logEntryId | UUID | no | Parent entry |
| itemId | UUID | no | Logged Item |
| sourceBundleId | UUID | yes | If present, item came from expanding this bundle (display/grouping hint) |

#### Relationships

- LoggedItem belongs to LogEntry
- LoggedItem references Item
- LoggedItem optionally references Bundle (as “source” only)

#### Validation / Constraints

- No duplicates within an entry: `(logEntryId, itemId)` unique.
- Enforce the single-type rule by validating `itemId`’s Type matches the entry’s Type.

#### Keying

- **Recommended (matches prior implementation)**: primary key = `(logEntryId, itemId)`
- Alternative: add a surrogate `id` column and keep `(logEntryId, itemId)` unique

---

### QuantifierValue (`log_entry_quantifier_values`)

Optional numeric values recorded for a specific Item’s QuantifierDefinition in a specific LogEntry.

#### Fields

| Field | Type | Nullable | Description |
|------|------|----------|-------------|
| logEntryId | UUID | no | Parent entry |
| itemId | UUID | no | Which item the value applies to |
| quantifierDefinitionId | UUID | no | Which Item quantifier definition |
| value | number | no | Numeric value |

#### Relationships

- QuantifierValue belongs to LogEntry
- QuantifierValue references Item
- QuantifierValue references QuantifierDefinition

#### Validation / Constraints

- One value per quantifier per item per entry: `(logEntryId, itemId, quantifierDefinitionId)` unique.
- `quantifierDefinitionId` must belong to `itemId`.
- If QuantifierDefinition has min/max, `value` must be within that range.

#### Keying

- **Recommended (matches prior implementation)**: primary key = `(logEntryId, itemId, quantifierDefinitionId)`
- Alternative: add a surrogate `id` column and keep `(logEntryId, itemId, quantifierDefinitionId)` unique

## Import/export implications (high-level)

- Logs are exportable as **CSV** for external analysis/sharing (see `import-export.md`).
- Canonical import/export of logs uses the app’s canonical YAML/JSON structures (see `import-export.md`).

## Deletion / integrity (high-level)

- Deleting a LogEntry deletes its LoggedItems and QuantifierValues.
- Taxonomy lifecycle is managed to preserve history (rename scope, retire/hide vs hard delete): see `rules.md`.


