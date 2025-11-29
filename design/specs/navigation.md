# Navigation Spec

Purpose
- Define app-wide navigation structure, deep links, and route options for Diario.

Sitemap (high-level)
- HOME Tab (stack)
  - `LogHistory` (root)  
    - Main log history showing Bob’s entries in chronological order.  
    - Actions:
      - Add: start a brand new entry (navigates to `EditEntry` in `new` mode).
      - Clone: clone a selected entry (navigates to `EditEntry` in `clone` mode with the source entryId).
      - Catalog: optional shortcut to `ConfigureCatalog`.
  - `EditEntry` (push from `LogHistory`)  
    - Focused flow for adding/editing/cloning a single entry.
  - `Graphs` (push from `LogHistory` or future entry points)  
    - List of graphs and individual graph views.

- CATALOG Tab (stack)
  - `ConfigureCatalog` (root)  
    - Manage categories, items, groups, and quantifiers.

- SETTINGS Tab (stack)
  - `SereusConnections` (root or push)  
    - View and manage Sereus cadre and guest nodes.

Deep Links
- Scheme: `diario://`
- Base patterns (screen-level):
  - `diario://screen/LogHistory`
  - `diario://screen/EditEntry`
  - `diario://screen/Graphs`
  - `diario://screen/ConfigureCatalog`
  - `diario://screen/SereusConnections`

- Common query parameters:
  - `variant`: optional mock/scenario variant (e.g., `happy`, `empty`, `error`), used in mock mode only.
  - `scenario`: optional scenario identifier for scenario docs.
  - Screen-specific params:
    - `EditEntry`:  
      - `mode`: one of `new`, `edit`, `clone`.  
      - `entryId`: optional ID of the entry to edit/clone.
    - `Graphs`:  
      - `graphId`: optional identifier for a specific graph to open.

Route Options
- LogHistory: title "History"
- EditEntry: title "Edit Entry"
- Graphs: title "Graphs"
- ConfigureCatalog: title "Catalog"
- SereusConnections: title "Sereus"

Back Navigation
- Within each tab’s stack, the “back” affordance (header back button or system back) should move to the previous screen in that stack.  
- From `EditEntry`, back returns to `LogHistory`.  
- From `ConfigureCatalog`, `Graphs`, and `SereusConnections`, back returns to `LogHistory` in the current MVP (until tabbed navigation is fully wired).  
- On Android, the hardware back button should be wired (via the navigator) to the same back behavior: pop within the current stack; if already at the root `LogHistory`, exit the app.

Notes
- Human navigation spec overrides any AI-generated navigation consolidation.

