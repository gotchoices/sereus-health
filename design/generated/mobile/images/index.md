---
appId: org.sereus.health
scheme: health

screenshots:
  # LogHistory
  - route: LogHistory
    variant: happy
    file: log-history-happy.png
    deps:
      - src/screens/LogHistory.tsx
  - route: LogHistory
    variant: empty
    file: log-history-empty.png

  # EditEntry
  - route: EditEntry
    params:
      mode: new
    file: edit-entry-new.png
    deps:
      - src/screens/EditEntry.tsx
  - route: EditEntry
    params:
      mode: clone
      entryId: entry-breakfast
    file: edit-entry-clone.png

  # ConfigureCatalog
  - route: ConfigureCatalog
    variant: happy
    file: configure-catalog-happy.png
    deps:
      - src/screens/ConfigureCatalog.tsx
  - route: ConfigureCatalog
    variant: empty
    file: configure-catalog-empty.png

  # EditItem
  - route: EditItem
    params:
      type: Activity
    file: edit-item-new.png
    deps:
      - src/screens/EditItem.tsx
  - route: EditItem
    params:
      itemId: item-omelette
    file: edit-item-edit.png

  # EditBundle
  - route: EditBundle
    params:
      type: Activity
    file: edit-bundle-new.png
    deps:
      - src/screens/EditBundle.tsx
  - route: EditBundle
    params:
      bundleId: bundle-blt
    file: edit-bundle-edit.png

  # Graphs
  - route: Graphs
    variant: happy
    file: graphs-happy.png
    deps:
      - src/screens/Graphs.tsx
  - route: Graphs
    variant: empty
    file: graphs-empty.png

  # GraphCreate
  - route: GraphCreate
    variant: happy
    file: graph-create.png
    deps:
      - src/screens/GraphCreate.tsx

  # GraphView
  - route: GraphView
    params:
      graphId: graph-1
    file: graph-view.png
    deps:
      - src/screens/GraphView.tsx

  # Settings
  - route: Settings
    file: settings.png
    deps:
      - src/screens/Settings.tsx

  # SereusConnections
  - route: SereusConnections
    variant: happy
    file: sereus-connections-happy.png
    deps:
      - src/screens/SereusConnections.tsx
  - route: SereusConnections
    variant: empty
    file: sereus-connections-empty.png

  # Reminders
  - route: Reminders
    file: reminders.png
    deps:
      - src/screens/Reminders.tsx
---

# Screenshots

| Screen | Variant | Preview |
|--------|---------|---------|
| LogHistory | happy | ![](log-history-happy.png) |
| LogHistory | empty | ![](log-history-empty.png) |
| EditEntry | new | ![](edit-entry-new.png) |
| EditEntry | clone | ![](edit-entry-clone.png) |
| ConfigureCatalog | happy | ![](configure-catalog-happy.png) |
| ConfigureCatalog | empty | ![](configure-catalog-empty.png) |
| EditItem | new | ![](edit-item-new.png) |
| EditItem | edit | ![](edit-item-edit.png) |
| EditBundle | new | ![](edit-bundle-new.png) |
| EditBundle | edit | ![](edit-bundle-edit.png) |
| Graphs | happy | ![](graphs-happy.png) |
| Graphs | empty | ![](graphs-empty.png) |
| GraphCreate | - | ![](graph-create.png) |
| GraphView | - | ![](graph-view.png) |
| Settings | - | ![](settings.png) |
| SereusConnections | happy | ![](sereus-connections-happy.png) |
| SereusConnections | empty | ![](sereus-connections-empty.png) |
| Reminders | - | ![](reminders.png) |
