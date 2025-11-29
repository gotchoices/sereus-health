---
id: EditEntry
route: EditEntry
variants: [happy, error]
provides:
  - screen:EditEntry
needs: []
description: >
  Screen for adding, editing, or cloning a single log entry, including type,
  selected items/groups, quantifiers, timestamp, and optional comment.
dependsOn:
  - design/stories/01-exploring.md
  - design/stories/02-daily.md
  - design/stories/03-configuring.md
  - design/stories/05-cloning.md
  - design/specs/screens/index.md
  - design/specs/navigation.md
  - design/specs/global/general.md
---

## Purpose and Role

EditEntry is the focused screen where Bob configures one log entry at a time.
It supports:
- Creating a new entry.
- Editing an existing entry from history.
- Cloning an existing entry from history and making small adjustments before saving.

## Key Behaviors

- Allow Bob to choose the entry **type** (Activity / Condition / Outcome or user-defined).
- Let Bob pick one or more **items/groups** within the chosen type/category
  (e.g., foods for a meal, exercises in a workout).
- Show and edit any **quantifiers** defined for the selected items
  (e.g., intensity 1–10, reps, minutes, miles).
- Let Bob adjust the **timestamp** in local time.
- Provide an optional **comment/notes** field for context.
- Provide primary actions to **Save/Commit** the entry and **Cancel/Discard** changes.

## Cloning

- When invoked in clone mode (e.g., from LogHistory), EditEntry should:
  - Start with all fields copied from the source entry (items, groups, quantifiers, comment).
  - Use a timestamp defaulted to “now”.
  - Let Bob review and modify any field before saving.

## Variants

- **happy**: A fully populated entry with type, items/groups, quantifiers, timestamp, and comment.
- **error**: A state where validation fails (e.g., missing required fields) and shows inline error messages;
  useful for scenarios but may be implemented later.


