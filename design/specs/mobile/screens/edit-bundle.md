# EditBundle Screen Spec

## Purpose
Create or edit a bundle — a named, ordered collection of items for fast logging.

## Invariants
- **Name** required; unique within its Type.
- **Type** is chosen on create and **read-only when editing**; every member shares the bundle's Type (type affinity).
- **At least one item** required. **Order is semantic** (BLT = Bacon-Lettuce-Tomato) and is preserved.
- Items are added via the shared item picker, with inline create for a missing item (`global/general.md` · Inline creation).
- Nested bundles are supported by the model but deferred in the UI (`domain/bundles.md`).
- Log entries store a bundle's **expanded items** with a source reference, so editing a bundle never changes
  past entries (`domain/logging.md`).
- Editing a bundle that history references follows the taxonomy lifecycle — prefer retire over delete (`domain/rules.md`).
