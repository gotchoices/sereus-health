# Navigation Spec

Purpose
- Define app-wide navigation structure, deep links, and route options for Diario.

Sitemap
- HOME Tab
  - LogHistory (root) — main log history showing Bob’s entries and an action to add/clone.
  - EditEntry (push from LogHistory) — focused flow for adding/editing/cloning a single entry.
  - Graphs (push from LogHistory or other entry points) — list of graphs and individual graph view.
- CATALOG Tab
  - ConfigureCatalog (root) — manage categories, items, groups, and quantifiers.
- SETTINGS Tab
  - SereusConnections (push) — view and manage Sereus cadre and guest nodes.

Deep Links
- Scheme: diario://
- Patterns:
  - diario://screen/LogHistory
  - diario://screen/EditEntry
  - diario://screen/Graphs
  - diario://screen/ConfigureCatalog
  - diario://screen/SereusConnections

Route Options
- LogHistory: title "History"
- EditEntry: title "Edit Entry"
- Graphs: title "Graphs"
- ConfigureCatalog: title "Catalog"
- SereusConnections: title "Sereus"

Notes
- Human navigation spec overrides any AI-generated navigation consolidation.

