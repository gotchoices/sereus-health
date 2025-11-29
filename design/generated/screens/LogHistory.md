---
id: LogHistory
route: LogHistory
variants: [happy, empty]
provides:
  - screen:LogHistory
needs: []
description: >
  Main log history screen showing Bob’s past entries in chronological order,
  with actions to add new entries and clone existing ones for faster data entry.
dependsOn:
  - design/stories/01-exploring.md
  - design/stories/02-daily.md
  - design/stories/05-cloning.md
  - design/specs/screens/index.md
  - design/specs/navigation.md
  - design/specs/global/general.md
---

## Purpose and Role

LogHistory is the first screen Bob sees after installing and launching Diario.
It shows a chronological list of his log entries (activities, conditions, outcomes)
and acts as the primary entry point for adding new entries and cloning past ones.

## Key Behaviors

- Display a scrollable list of log entries, newest first (grouped by day is acceptable).
- When history is empty, show a friendly welcome/empty state message.
- Each list row summarizes a single log entry:
  - Type (Activity / Condition / Outcome or user-defined top-level type).
  - Short description composed from selected items (e.g., “Breakfast: omelette, toast, orange juice”,
    “Outcome: stomach pain (Intensity 7)”).
  - Timestamp, displayed in the user’s local timezone.
- Provide an obvious action to **add** a new log entry (navigates to EditEntry).
- Allow selecting an existing entry and choosing to **clone** it (navigates to EditEntry prefilled
  with that entry, following cloning rules from the stories).
- Support basic filtering/search over the list (e.g., by text match on items or types) using
  the reusable selection list widget described in the global specs.

## Cloning Integration

- From LogHistory, Bob can choose an existing entry and invoke a “Clone” action.
- The cloned entry should:
  - Copy all fields from the original (items, groups, quantifiers, comments).
  - Set the timestamp to “now”.
  - Open in EditEntry in edit mode so Bob can review/adjust before committing.

## Navigation

- On load, LogHistory is the root screen of the HOME tab (see navigation spec).
- Tapping the add action navigates to EditEntry (new entry mode).
- Tapping a history row may:
  - Open EditEntry for viewing/editing that specific entry, or
  - Offer a small action tray with “View/Edit” and “Clone” (implementation detail).

## Variants

- **happy**: Non-empty history with a representative mix of activities, conditions, and outcomes,
  including at least one entry suitable for cloning (e.g., repeated breakfast).
- **empty**: No log entries yet; show welcome text and a clear call-to-action to create the first entry.


