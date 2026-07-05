---
id: domain-rules
name: Domain Rules
description: Cross-cutting invariants and constraints for Sereus Health data model.
---

## Cross-cutting invariants (intentional "hard rules")

- **Identifiers / keys**
  - User-visible entities (Type, Category, Item, Bundle, QuantifierDefinition, LogEntry) have stable **UUID** IDs.
  - Join tables may use **composite keys** (see `logging.md`).
- **Time**: A log entry's timestamp is stored as a **UTC instant** (the sort/correlation key). Each entry also stores `eventUtcOffsetMinutes` — the local UTC offset in effect where/when it was logged. History is displayed in the entry's **originating zone** (local = UTC + offset), **not** the viewer's current device zone, so an event's local time never shifts as the user travels.
- **Flat categories (MVP)**: No category nesting.
- **Single-type log entries**: A log entry contains items/bundles of exactly one Type.
- **Bundle expansion**: Bundles are expanded to items at log-time; entries store items, with optional "source bundle" for display/grouping.
- **Retire vs delete**: Catalog elements (Type, Category, Item, QuantifierDefinition, Bundle) carry an optional `retiredAt` timestamp. Retiring sets it, hiding the element from future selection while preserving all historical references. Hard delete is reserved for elements not referenced by history.
- **Quantifiers**: Defined per item; recorded values are optional (only stored when provided).
- **Name uniqueness is case-insensitive**
  - Type names are unique globally.
  - Category names are unique within a Type.
  - Item names are unique within a Category.
  - Bundle names are unique within a Type.
  - QuantifierDefinition names are unique within an Item.

## First-run / empty database (UX)

- First-run may start with an **empty database** (no seeded catalog rows and no log entries).
- The app should guide the user to either:
  - import a starter catalog (e.g. from `health.sereus.org`), or
  - create the first catalog entries manually.

## Editing taxonomy that is referenced by history (UX)

When a user edits a taxonomy element that is already referenced by historical log entries:
- **Description** can be edited freely.
- If **name** is edited, ask scope: “Apply to all existing entries” vs “Future only”.
  - If “Future only”, create a new definition for future use; existing entries remain attached to the old definition.
- If **deletion** is requested and the element is in use, prefer “retire/hide from future use” (sets `retiredAt`) over hard delete, and communicate the impact clearly.
