---
id: domain-rules
name: Domain Rules
description: Cross-cutting invariants and constraints for Sereus Health data model.
---

## Cross-cutting invariants (intentional "hard rules")

- **IDs**: Stable UUIDs (string) for all entities.
- **Time**: All stored timestamps are **UTC**; UI displays in device locale.
- **Flat categories (MVP)**: No category nesting.
- **Single-type log entries**: A log entry contains items/bundles of exactly one Type.
- **Bundle expansion**: Bundles are expanded to items at log-time; entries store items, with optional "source bundle" for display/grouping.
- **Quantifiers**: Defined per item; recorded values are optional (only stored when provided).

## First-run / empty database (UX)

- First-run may start with an **empty database** (no seeded catalog rows and no log entries).
- The app should guide the user to either:
  - import a starter catalog (e.g. from `health.sereus.org`), or
  - create the first catalog entries manually.

## Editing taxonomy that is referenced by history (UX)

When a user edits a taxonomy element that is already referenced by historical log entries:
- Description can be edited freely
- If name is edited, ask scope: “Apply to all existing entries” vs “Future only”.
  - If “Future only”, create a new definition for future use; existing entries remain attached to the old definition.
  - If deletion is requested and the element is in use, prefer “retire/hide from future use” over hard delete, and communicate the impact clearly.

## Notes

- Join tables (e.g. logged items / quantifier values) may use **composite primary keys** instead of separate `id` fields; see `logging.md`.
- Prefer keeping schema specs **short and stable**; detailed rationale and examples belong in AI consolidations (`design/generated/…`) or other non-authoritative notes.

