# EditCategory Screen Spec

## Purpose
Create or edit a category — just a name within a Type. Typically a small modal.

## Invariants
- **Name** required; **unique within its Type** (case-insensitive).
- **Type** is set from context on create and is **read-only when editing**.
- Creatable inline wherever a category is selected (item editor, and item creation while logging) —
  see `global/general.md` · Inline creation.
- Editing a category referenced by history follows the taxonomy lifecycle (`domain/rules.md`).
