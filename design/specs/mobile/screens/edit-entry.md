# EditEntry Screen Spec

## Purpose
Single-screen form to create, edit, or clone a log entry — optimized for fast daily logging
(stories `02-daily.md`, `03-configuring.md`, `04-cloning.md`).

## Invariants
- **Modes**: new / edit / clone. Clone copies the entry but resets the timestamp to now.
- **Single-type per entry** (`domain/rules.md`): all of an entry's items are one Type. The user picks
  items across that Type's categories, plus optional bundles.
- **Inline creation**: items — and, as needed, their category and quantifiers — can be created on the
  fly while logging (see the inline-creation policy in `global/general.md`).
- **Timestamp** defaults to now and is editable (device zone; stored per `global/general.md` · Time).
- **Quantifiers** are optional; shown for selected items that define them.

Layout, pickers, ordering, and empty states are inferred from the stories, `domain/*`, and `global/*`
— see the generated consolidation. Keep this file to what the stories don't already imply.
