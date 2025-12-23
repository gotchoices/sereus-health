---
id: logging
name: Logging
description: Log entries, logged items, and recorded quantifier values (bundle expansion at log-time).
---

This covers the data model for what the user actually logs over time.

## Bundle expansion (key semantic rule)

When a user logs a Bundle, the system **expands** it into its member Items at log-time and stores those Items on the entry. This preserves historical accuracy if the bundle definition changes later.

## Entities

### LogEntry (`log_entries`)

One entry at a point in time, containing 0–N items and optional notes.

#### Fields

| Field | Type | Required | Description |
|------|------|----------|-------------|
| id | UUID | yes | Stable identifier |
| typeId | UUID | yes | Entry’s Type (single-type rule) |
| timestampUtc | ISO8601 | yes | Stored in UTC; user-editable |
| comment | string | no | Optional free-form note |

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

| Field | Type | Required | Description |
|------|------|----------|-------------|
| logEntryId | UUID | yes | Parent entry |
| itemId | UUID | yes | Logged Item |
| sourceBundleId | UUID | no | If present, item came from expanding this bundle (display/grouping hint) |

#### Relationships

- LoggedItem belongs to LogEntry
- LoggedItem references Item
- LoggedItem optionally references Bundle (as “source” only)

#### Validation / Constraints

- No duplicates within an entry: `(logEntryId, itemId)` unique.
- Enforce the single-type rule by validating `itemId`’s Type matches the entry’s Type.

#### Keying (implementation choice)

- **Recommended (matches prior implementation)**: primary key = `(logEntryId, itemId)`
- Alternative: add a surrogate `id` column and keep `(logEntryId, itemId)` unique

---

### QuantifierValue (`log_entry_quantifier_values`)

Optional numeric values recorded for a specific Item’s QuantifierDefinition in a specific LogEntry.

#### Fields

| Field | Type | Required | Description |
|------|------|----------|-------------|
| logEntryId | UUID | yes | Parent entry |
| itemId | UUID | yes | Which item the value applies to |
| quantifierDefinitionId | UUID | yes | Which Item quantifier definition |
| value | number | yes | Numeric value |

#### Relationships

- QuantifierValue belongs to LogEntry
- QuantifierValue references Item
- QuantifierValue references QuantifierDefinition

#### Validation / Constraints

- One value per quantifier per item per entry: `(logEntryId, itemId, quantifierDefinitionId)` unique.
- `quantifierDefinitionId` must belong to `itemId`.
- If QuantifierDefinition has min/max, `value` must be within that range.

#### Keying (implementation choice)

- **Recommended (matches prior implementation)**: primary key = `(logEntryId, itemId, quantifierDefinitionId)`
- Alternative: add a surrogate `id` column and keep `(logEntryId, itemId, quantifierDefinitionId)` unique

## Deletion / integrity (high-level)

- Deleting a LogEntry deletes its LoggedItems and QuantifierValues.
- Taxonomy deletions are restricted/managed (see `specs/mobile/global/general.md` taxonomy lifecycle).


