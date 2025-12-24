---
provides:
  - screen:mobile:EditItem
needs:
  - schema:taxonomy
dependsOn:
  - design/stories/mobile/03-configuring.md
  - design/specs/mobile/screens/edit-item.md
  - design/specs/mobile/screens/index.md
  - design/specs/mobile/navigation.md
  - design/specs/mobile/global/general.md
  - design/specs/mobile/global/ui.md
  - design/specs/schema/taxonomy.md
---

# EditItem Screen Consolidation

## Purpose

Create or edit an individual catalog item (name, description, category, quantifier definitions).

## UX contract (from human spec)

- Single scrollable form.
- Type chips: selectable in create mode; **read-only in edit mode**.
- Category: picker modal filtered by selected type + inline create.
- Quantifiers: list + add/edit/delete via modal editor.
- Save returns to Catalog.


