---
id: data-access
namespace: DataAccess
description: Local data access contract for the app (backed by Quereus/Sereus sync), not an HTTP API.
---

This project does not assume a client/server model. If an “API” exists, it is a **local procedure boundary** between UI code and the data layer.

## Source of truth

- **Schema specs live in `design/specs/schema/*.md`**:
  - `specs/schema/taxonomy.md`
  - `specs/schema/bundles.md`
  - `specs/schema/logging.md`

## Minimal operations (suggested)

These are the “shape” of what screens typically need. Naming can follow whatever Quereus adapter you prefer.

### Taxonomy

- List/create/update Types
- List/create/update Categories (scoped to Type)
- List/create/update Items (scoped to Category)
- List/create/update QuantifierDefinitions (scoped to Item)

### Bundles

- List/create/update Bundles (scoped to Type)
- Read/modify Bundle membership (items + nested bundles)

### Logging

- Create/update/delete LogEntry
- Read LogEntry and its LoggedItems + QuantifierValues
- Query LogEntries by time range and/or Type

## Notes

- We intentionally avoid documenting “how to SQL” here; that is straightforward and implementation-specific.

