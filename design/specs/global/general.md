## Diario – General Specs

These are cross-cutting behaviors and assumptions that apply across multiple screens and features.

### Storage and Fabric

- **Sereus fabric and SQL**  
  - Diario runs on top of Sereus fabric; user data is stored in an SQL database built on the user’s cadre of Sereus nodes.  
  - Application data such as log entries, taxonomy (types, categories, items, groups), quantifier definitions, and app settings should be modeled in this SQL layer so that it can be synced across nodes.
  - In-app state management (e.g., React/React Native state, optional Redux) should treat Sereus/SQL as the source of truth for persisted data, with local state acting as a cache/interaction layer.

### Graphing (MVP)

- **Graph creation**  
  - For the MVP, Bob configures graphs by manually selecting specific items (as described in the “Graphing the Data” story) and then invoking a graphing action.
  - Additional presets or saved/named graph templates are considered post-MVP and are tracked in `docs/STATUS.md`.

- **Graph persistence**  
  - Graphs created by Bob are **ephemeral** in the MVP: they exist while the app is running and remain available until he explicitly closes/dismisses them or the app is fully terminated.  
  - After a full app restart, previously created graphs do not automatically reappear; Bob can recreate them by selecting items again and generating new graphs.


