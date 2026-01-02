# Navigation Spec

Purpose
- Define app-wide navigation structure, deep links, and route options for Sereus Health.

Sitemap (high-level)
- HOME Tab (stack)
  - `LogHistory` (root)  
    - Main log history showing Bob's entries in chronological order.  
    - Actions:
      - Add: start a brand new entry (navigates to `EditEntry` in `new` mode).
      - Clone: clone a selected entry (navigates to `EditEntry` in `clone` mode with the source entryId).
      - Graph icon: navigate to `Graphs` screen.
      - Export: export log entries to CSV (filtered or all).
      - Import: import historical log entries from CSV/YAML.
  - `EditEntry` (push from `LogHistory`)  
    - Add/edit/clone a single entry.
  - `Graphs` (push from `LogHistory`)  
    - Browse saved graphs.
  - `GraphCreate` (push from `Graphs`)  
    - Create a graph.
  - `GraphView` (push from `Graphs` or `GraphCreate`)  
    - View a graph.

- CATALOG Tab (stack)
  - `ConfigureCatalog` (root)  
    - Manage categories, items, bundles, and quantifiers.
    - Actions:
      - Tap item: navigate to `EditItem` to edit that item.
      - Tap bundle: navigate to `EditBundle` to edit that bundle.
      - "Add" button (Items view): navigate to `EditItem` in create mode.
      - "Add" button (Bundles view): navigate to `EditBundle` in create mode.
      - Export: export catalog to CSV.
      - Import: import catalog from CSV/YAML.
  - `EditItem` (push from `ConfigureCatalog`)  
    - Create or edit a catalog item.
    - Create/edit an item.
  - `EditBundle` (push from `ConfigureCatalog`)  
    - Create or edit a bundle.
    - Create/edit a bundle.

- SETTINGS Tab (stack)
  - `Settings` (root)  
    - List of setting categories:
      - Sereus Connections → push to `SereusConnections`
      - Reminders → push to `Reminders`
      - Backup & Restore → push to `BackupRestore`
      - (Future: AI Agent, Preferences, About)
  - `BackupRestore` (push from `Settings`)
    - Export/import full backup (and restore) from Settings.
  - `SereusConnections` (push from `Settings`)  
    - View and manage Sereus cadre and guest nodes.
    - Actions: Scan QR to add node, view node status, remove nodes.
  - `Reminders` (push from `Settings`)  
    - Configure notification interval (hours or "Off").
    - Simple time picker UI.

Deep Links
- Scheme: `health://`
- Base patterns (screen-level):
  - `health://screen/LogHistory`
  - `health://screen/EditEntry`
  - `health://screen/ConfigureCatalog`
  - `health://screen/EditItem`
  - `health://screen/EditBundle`
  - `health://screen/Graphs`
  - `health://screen/GraphCreate`
  - `health://screen/GraphView`
  - `health://screen/Settings`
  - `health://screen/BackupRestore`
  - `health://screen/SereusConnections`
  - `health://screen/Reminders`

- Common query parameters:
  - `variant`: optional mock/scenario variant (e.g., `happy`, `empty`, `error`), used in mock mode only.
  - `scenario`: optional scenario identifier for scenario docs.
  - Screen-specific params:
    - `EditEntry`:  
      - `mode`: one of `new`, `edit`, `clone`.  
      - `entryId`: optional ID of the entry to edit/clone.
    - `EditItem`:  
      - `itemId`: optional ID of item to edit (omit for create mode).
      - `type`: optional type name to pre-select (for create mode), one of `Activity|Condition|Outcome`.
    - `EditBundle`:  
      - `bundleId`: optional ID of bundle to edit (omit for create mode).
      - `type`: optional type name to pre-select (for create mode), one of `Activity|Condition|Outcome`.
    - `Graphs`:  
      - No additional params (shows list of all saved graphs).
    - `GraphCreate`:  
      - `preselectedItems`: optional comma-separated list of item IDs to pre-select.
    - `GraphView`:  
      - `graphId`: identifier for a specific saved graph to display.

- Action links (from notifications, QR codes, etc.):
  - `health://sereus/add-node?nodeId={id}&type={cadre|guest}`
    - Opens SereusConnections with add-node prompt (Story 07).
  - `health://reminder/log`
    - Opens EditEntry in new mode (Story 08: tap notification to add entry).

Route Options
- LogHistory: title "History"
- EditEntry: title "New Entry" | "Edit Entry" | "Clone Entry" (based on mode)
- ConfigureCatalog: title "Catalog"
- EditItem: title "Add Item" | "Edit Item" (based on mode)
- EditBundle: title "Add Bundle" | "Edit Bundle" (based on mode)
- Graphs: title "Graphs"
- GraphCreate: title "Create Graph"
- GraphView: title "{Graph Name}" (dynamic based on graph)
- Settings: title "Settings"
- BackupRestore: title "Backup & Restore"
- SereusConnections: title "Sereus Connections"
- Reminders: title "Reminders"

Back Navigation
- Within each tab's stack, the "back" affordance (header back button or system back) should pop to the previous screen in that stack.  
- HOME tab stack:
  - From `EditEntry` → back to `LogHistory`
  - From `Graphs` → back to `LogHistory`
  - From `GraphCreate` → back to `Graphs`
  - From `GraphView` → back to `Graphs` (if from list) or `GraphCreate` (if just generated)
- CATALOG tab:
  - From `EditItem` → back to `ConfigureCatalog`
  - From `EditBundle` → back to `ConfigureCatalog`
  - Tab root (`ConfigureCatalog`) has no back action (already at root).
- SETTINGS tab stack:
  - From `SereusConnections` → back to `Settings`
  - From `Reminders` → back to `Settings`
  - At `Settings` root, no back action (already at root).
- At any tab root, Android hardware back button exits the app.
- Cross-tab navigation (tapping bottom tab) switches context; no "back" between tabs.

Notes
- Human navigation spec overrides any AI-generated navigation consolidation.

