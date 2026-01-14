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

## First-run seed expectations (UX)

- Provide initial Types: **Activity**, **Condition**, **Outcome** (with optional colors and display order).
- Provide a small starter set of Categories (e.g., Eating/Exercise/Recreation; Stress/Weather/Environment; Pain/Health/Well-being).
- Provide a single "welcome" LogEntry (comment-only) so first launch is not a blank screen.

## Notes

- Join tables (e.g. logged items / quantifier values) may use **composite primary keys** instead of separate `id` fields; see `logging.md`.
- Prefer keeping schema specs **short and stable**; detailed rationale and examples belong in AI consolidations (`design/generated/…`) or other non-authoritative notes.

