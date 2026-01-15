# LogHistory Screen Spec

## Entry Card Layout

Each log entry card has a compact 3-line layout:

### Line 1 (Header Row)
| Position | Element |
|----------|---------|
| **Left** | Type badge (Activity/Condition/Outcome) - pill with semantic color |
| **Center-left** | Date/time, immediately after type badge |
| **Right** | Clone icon (copy-outline) |

### Line 2 (Items)
- List of items/bundles, comma-separated
- Truncate with "+N more" if >3 items

### Line 3 (Comment, optional)
- Italicized comment snippet, single line, truncated

## Vertical Spacing
- **Compact**: Minimize vertical padding for denser list display
- Card padding: 12px (was 16px)
- Line spacing: 4px between rows (was 8px)
- Card margin: 8px bottom

## Clone Button
- Positioned absolutely in top-right corner of card
- Same vertical alignment as type badge and date
- Touch target: 44pt minimum with hitSlop

## Type Badge
- Left-aligned, not right-aligned
- Small pill with semantic color (Activity=blue, Condition=orange, Outcome=green)
- White text, 600 weight

## Import / Export (data portability)

- Expose **Export** and **Import** actions from LogHistory.
- Export supports **filtered subset** (if a filter is active) and **all entries**.
- Export format: CSV per `design/specs/domain/import-export.md`.
- Import supports the canonical app format (YAML/JSON) and is idempotent per `design/specs/domain/import-export.md`.

