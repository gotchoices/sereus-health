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

## Database Insert

The assistant should only propose database actions that can be implemented via inserts, such as:

- Create new catalog items / bundles / quantifiers
- Create new log entries
- Import canonical data (as inserts)

If the user asks to “remove” or “edit” existing data, the assistant should:

- explain that destructive edits aren’t supported, and
- suggest the nearest safe alternative (e.g., create a replacement item, or add a new entry correcting history).

## Reminders
The assistant can propose reminder changes, but DB writes should remain insert-only. If “reminder deletion” is needed, model it as “disable” by inserting a new reminder config that supersedes the old one (until we explicitly add destructive edits).
