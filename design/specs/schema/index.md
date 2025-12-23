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

## Recommended indexes (performance)

These are small, high-value indexes used in the prior implementation:

- `categories(type_id)`
- `items(category_id)`
- `item_quantifiers(item_id)`
- `bundles(type_id)`
- `bundle_members(bundle_id)`, `bundle_members(item_id)`, `bundle_members(member_bundle_id)`
- `log_entries(timestamp DESC)`, `log_entries(type_id)`
- `log_entry_items(entry_id)`, `log_entry_items(item_id)`, `log_entry_items(source_bundle_id)`
- `log_entry_quantifier_values(entry_id)`

## First-run seed expectations (UX)

- Provide initial Types: **Activity**, **Condition**, **Outcome** (with optional colors and display order).
- Provide a small starter set of Categories (e.g., Eating/Exercise/Recreation; Stress/Weather/Environment; Pain/Health/Well-being).
- Provide a single “welcome” LogEntry (comment-only) so first launch is not a blank screen.

## Notes

- Join tables (e.g. logged items / quantifier values) may use **composite primary keys** instead of separate `id` fields; see `logging.md`.
- Prefer keeping schema specs **short and stable**; detailed rationale and examples belong in `reject.md` or AI consolidations (`design/generated/…`).

