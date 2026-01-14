---
provides:
  - screen:mobile:EditBundle
needs:
  - schema:taxonomy
  - schema:bundles
dependsOn:
  - design/stories/mobile/03-configuring.md
  - design/specs/mobile/screens/edit-bundle.md
  - design/specs/mobile/screens/index.md
  - design/specs/mobile/navigation.md
  - design/specs/mobile/global/general.md
  - design/specs/mobile/global/ui.md
  - design/specs/domain/taxonomy.md
  - design/specs/domain/bundles.md
---

# EditBundle Screen Consolidation

## Purpose

Create or edit a bundle (named collection of items) for a single type (Activity/Condition/Outcome).

## UX contract (from human spec)

- Name required.
- Type chips: selectable in create mode; **read-only in edit mode**.
- Bundle items: list + “+” opens item picker modal (search + multi-select).
- Save returns to Catalog.


