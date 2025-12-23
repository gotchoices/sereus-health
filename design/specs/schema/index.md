---
id: schema-index
name: Schema Index
description: Shared data model for Sereus Health (all targets).
---

Shared data model definitions. These specs are used across all targets.

## Files

| Area | File | What it covers |
|------|------|----------------|
| Taxonomy | `taxonomy.md` | Types → Categories → Items + item quantifiers (definitions) |
| Bundles | `bundles.md` | Bundles and membership rules |
| Logging | `logging.md` | Log entries, logged items, quantifier values; bundle expansion semantics |
| Review pile | `reject.md` | Material removed from the original draft for later review |

## Cross-cutting invariants (intentional “hard rules”)

- **IDs**: Stable UUIDs (string) for all entities.
- **Time**: All stored timestamps are **UTC**; UI displays in device locale.
- **Flat categories (MVP)**: No category nesting.
- **Single-type log entries**: A log entry contains items/bundles of exactly one Type.
- **Bundle expansion**: Bundles are expanded to items at log-time; entries store items, with optional “source bundle” for display/grouping.
- **Quantifiers**: Defined per item; recorded values are optional (only stored when provided).

## Notes

- Prefer keeping schema specs **short and stable**; detailed rationale and examples belong in `reject.md` or AI consolidations (`design/generated/…`).

