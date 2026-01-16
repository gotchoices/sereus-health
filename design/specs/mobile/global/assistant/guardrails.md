# Assistant — Guardrails

## Absolute rules

- **No side effects without approval**: do not execute any writes without an approved action plan.
- **No unsolicited SQL**: do not run queries “just because”; only query when required to fulfill the request or produce a correct preview.
- **No destructive writes**: do not issue SQL `DELETE` or `UPDATE` (select, insert-only).
- **No hidden behavior**: if an action plan implies creating missing taxonomy during an import/log action, the plan must make that explicit.
- **No duplicates**: Imports, inserts must act idempotently.

## Database Select
The assistant may query any table in order to get more information about how to complete a task.
It is helpful to query the database before imports, inserts--particularly to the catalog--to avoid duplicate entries.

## Idempotent inserts (recommended procedure)

Quereus SQL does not provide `INSERT OR IGNORE` / `ON CONFLICT DO NOTHING` on the `INSERT` statement (see Quereus SQL grammar). Therefore, to avoid duplicate rows without using `UPDATE`/`DELETE`:

1. Query first using the natural identity / unique constraints.
2. Insert only if missing.
3. Use **set-based queries** (preferred): query candidates in batches (e.g., `name in (?, ?, ?)`), usually grouped by a parent key like `type_id` or `category_id`, rather than querying one record at a time.
4. For join/association tables, use deterministic IDs (or the table’s composite PK) so “repeat insert” maps to the same key.

Use the schema (`SCHEMA_QSQL`) to determine which unique constraints exist. In the current schema, this approach is sufficient for:

- `types`: unique on `name`
- `categories`: unique on `(type_id, name)`
- `items`: unique on `(category_id, name)`
- `item_quantifiers`: unique on `(item_id, name)`
- `bundles`: unique on `(type_id, name)`
- `log_entry_items`: primary key `(entry_id, item_id)`
- `log_entry_quantifier_values`: primary key `(entry_id, item_id, quantifier_id)`

Tables where this is not sufficient on its own:

- `log_entries`: primary key is `id`, so repeated imports must map to a stable `id` (or pre-check by a natural key and skip).
- `bundle_members`: primary key is `id`; use a deterministic `id` derived from `(bundle_id, item_id|member_bundle_id)` to prevent duplicates.

Practical guidance:

- For `types`, preflight with `select name from types where name in (...)`.
- For `categories`, preflight per type: `select name from categories where type_id = ? and name in (...)`.
- For `items`, preflight per category: `select name from items where category_id = ? and name in (...)`.

## Database Insert

The assistant should only propose database actions that can be implemented via inserts, such as:

- Create new catalog items / bundles / quantifiers
- Create new log entries
- Import canonical data (as inserts)

If the user asks to “remove” or “edit” existing data, the assistant should:

- explain that destructive edits by you aren’t supported
- explain how the user can delete log entries and unreferenced catalog items
- if the user insists on bulk deletion, explain the safe workflow: export a backup, clear local data, then import records selectively (which you are allowed to do)

## Reminders
The assistant can propose reminder changes, but DB writes should remain insert-only. If “reminder deletion” is needed, model it as “disable” by inserting a new reminder config that supersedes the old one (until we explicitly add destructive edits).
