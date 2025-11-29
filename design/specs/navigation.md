# Navigation Spec

Purpose
- Define app-wide navigation structure, deep links, and route options for Diario.

Sitemap (high-level)
- HOME Tab (stack)
  - `LogHistory` (root)  
    - Main log history showing Bob's entries in chronological order.  
    - Actions:
      - Add: start a brand new entry (navigates to `EditEntry` in `new` mode).
      - Clone: clone a selected entry (navigates to `EditEntry` in `clone` mode with the source entryId).
      - Graph icon: navigate to `Graphs` screen.
  - `EditEntry` (push from `LogHistory`)  
    - Focused flow for adding/editing/cloning a single entry.
    - Internal progression: Type selection → Category selection → Item selection → Quantifiers/Comment.
  - `Graphs` (push from `LogHistory`)  
    - List of saved/named graphs Bob has created.
    - Actions:
      - Tap graph: navigate to `GraphView` to view/share that graph.
      - "Create Graph" button: navigate to `GraphCreate`.
  - `GraphCreate` (push from `Graphs`)  
    - Item picker (multi-select from all loggable items).
    - Date range configuration.
    - Graph name input.
    - "Generate" button: navigate to `GraphView` with new graph.
  - `GraphView` (push from `Graphs` or `GraphCreate`)  
    - Display generated graph.
    - Share action to export graph image.

- CATALOG Tab (stack)
  - `ConfigureCatalog` (root)  
    - Manage categories, items, groups, and quantifiers.

- SETTINGS Tab (stack)
  - `Settings` (root)  
    - List of setting categories:
      - Sereus Connections → push to `SereusConnections`
      - Reminders → push to `Reminders`
      - (Future: AI Agent, Preferences, Data Management, About)
  - `SereusConnections` (push from `Settings`)  
    - View and manage Sereus cadre and guest nodes.
    - Actions: Scan QR to add node, view node status, remove nodes.
  - `Reminders` (push from `Settings`)  
    - Configure notification interval (hours or "Off").
    - Simple time picker UI.

Deep Links
- Scheme: `diario://`
- Base patterns (screen-level):
  - `diario://screen/LogHistory`
  - `diario://screen/EditEntry`
  - `diario://screen/Graphs`
  - `diario://screen/GraphCreate`
  - `diario://screen/GraphView`
  - `diario://screen/ConfigureCatalog`
  - `diario://screen/Settings`
  - `diario://screen/SereusConnections`
  - `diario://screen/Reminders`

- Common query parameters:
  - `variant`: optional mock/scenario variant (e.g., `happy`, `empty`, `error`), used in mock mode only.
  - `scenario`: optional scenario identifier for scenario docs.
  - Screen-specific params:
    - `EditEntry`:  
      - `mode`: one of `new`, `edit`, `clone`.  
      - `entryId`: optional ID of the entry to edit/clone.
    - `Graphs`:  
      - No additional params (shows list of all saved graphs).
    - `GraphCreate`:  
      - `preselectedItems`: optional comma-separated list of item IDs to pre-select.
    - `GraphView`:  
      - `graphId`: identifier for a specific saved graph to display.

- Action links (from notifications, QR codes, etc.):
  - `diario://sereus/add-node?nodeId={id}&type={cadre|guest}`
    - Opens SereusConnections with add-node prompt (Story 07).
  - `diario://reminder/log`
    - Opens EditEntry in new mode (Story 08: tap notification to add entry).

Route Options
- LogHistory: title "History"
- EditEntry: title "New Entry" | "Edit Entry" | "Clone Entry" (based on mode)
- Graphs: title "Graphs"
- GraphCreate: title "Create Graph"
- GraphView: title "{Graph Name}" (dynamic based on graph)
- ConfigureCatalog: title "Catalog"
- Settings: title "Settings"
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
  - Tab root (`ConfigureCatalog`) has no back action (already at root).
- SETTINGS tab stack:
  - From `SereusConnections` → back to `Settings`
  - From `Reminders` → back to `Settings`
  - At `Settings` root, no back action (already at root).
- At any tab root, Android hardware back button exits the app.
- Cross-tab navigation (tapping bottom tab) switches context; no "back" between tabs.

Notes
- Human navigation spec overrides any AI-generated navigation consolidation.

