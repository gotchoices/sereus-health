---
id: ConfigureCatalog
route: ConfigureCatalog
variants: [happy, empty, error]
provides:
  - screen:mobile:ConfigureCatalog
needs:
  - schema:taxonomy
  - schema:bundles
description: >
  Screen for managing the catalog of items, categories, and bundles used when logging entries.
dependsOn:
  - design/stories/mobile/01-exploring.md
  - design/stories/mobile/02-daily.md
  - design/stories/mobile/03-configuring.md
  - design/specs/mobile/screens/index.md
  - design/specs/mobile/screens/configure-catalog.md
  - design/specs/mobile/navigation.md
  - design/specs/mobile/global/general.md
  - design/specs/mobile/global/ui.md
  - design/specs/schema/taxonomy.md
  - design/specs/schema/bundles.md
---

## Purpose and Role

ConfigureCatalog lets Bob curate the vocabulary he uses in Sereus Health:
categories, items, groups, and the quantifiers attached to items.
It supports bulk creation (e.g., “fridge pass”) and group creation
for combinations like a BLT.

> Note: current human spec uses **Items/Bundles** terminology; older story language uses “groups”.
> In this app version, “group” maps to **bundle**.

## Key Behaviors

- Show a list of existing **items and groups** within a selected type/category,
  using the reusable selection list widget (list + optional filter).
- Allow Bob to **add new items** quickly (e.g., entering many foods in a row).
- Allow Bob to create and edit **groups** that contain items (and possibly other groups),
  including:
  - Choosing items via filter-as-you-type search.
  - Showing which items are already in the group.
- Provide a simple entry point to define or edit **quantifiers** for items.
- Respect taxonomy lifecycle rules when editing items/groups that already appear in history
  (prompt whether changes apply to all entries or only future ones).

## Variants

- **happy**: Catalog contains a non-empty set of categories, items, and at least one group
  (e.g., BLT) so Bob can see and edit realistic data.
- **empty**: No items or groups yet; emphasizes the “fridge pass” path where Bob adds many
  items rapidly.
- **error**: Used for validation or edit conflict scenarios (e.g., attempting to delete an
  item that is already used), to be refined later.


