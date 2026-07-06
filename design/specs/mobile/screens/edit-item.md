# EditItem Screen Spec

## Purpose
Create or edit a catalog item: name, optional description, its category, and its quantifier definitions.
This is the explicit item editor (the fast path is inline creation while logging — see `edit-entry.md`).

## Invariants
- **Name** required; **description** optional.
- **Type** is chosen on create and is **read-only when editing** (an item's Type is fixed).
- **Category** is required — pick an existing one or create it inline (see `global/general.md` · Inline creation).
- **Quantifiers**: zero or more, each a name with optional min/max and units.
- Editing an item that history references follows the taxonomy lifecycle — rename scope, prefer retire over
  hard delete (`domain/rules.md`).

Layout and flow are inferred from the stories and `global/*`; see the generated consolidation.
