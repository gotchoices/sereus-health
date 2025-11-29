## Design Status

This file tracks open design questions for Diario so they can be resolved one at a time.

### Open Questions / TODOs

- [ ] **Correlations & insights UX**: Decide how Bob reviews his data to “assess health” beyond the basic graphing story (e.g., filters such as “what usually precedes stomach pain?”, comparison views, saved queries, prebuilt graph templates).
- [x] **Top-level type semantics**: Clarify whether `Activity`, `Condition`, and `Outcome` are fixed top-level types or whether users can define additional top-level types (e.g., `Medication`), and how these are presented in the UI.  
  - Answered in `02-daily.md`: Bob can edit or delete these categories and use other top-level categories instead.
- [ ] **Category hierarchy & naming**: Define the allowed hierarchy (type → category → item → group), whether deeper nesting is allowed, and naming rules (e.g., can items belong to multiple categories? can groups be nested?).
- [ ] **Taxonomy lifecycle (edit/delete behavior)**: Decide how editing or deleting categories, items, groups, and quantifiers should behave when existing log entries reference them (e.g., rename only, soft delete with retention, hard delete constraints).
- [ ] **Scope & sharing of definitions**: Determine whether items, groups, and categories are per-user only or whether there are global/shared templates or presets, and how ownership/visibility works.
- [ ] **Quantifier types & constraints**: Enumerate supported quantifier types (integer, decimal, 1–10 scale, distance + units, duration, boolean, etc.), allowed ranges/validation, and defaults for newly created quantifiers.
- [ ] **Quantifier attachment model**: Confirm whether quantifiers are defined per-item, per-category, or both (e.g., does “Intensity 1–10” live on the item definition, on the category, or can it be reused across items?).
- [ ] **Logging flow structure**: Decide whether adding a log entry is a single screen with sections or a multi-step wizard (type → category → items → quantifiers → time/comment), and how “back”/cancel should behave.
- [ ] **Comment/notes support**: Specify where free-form comments are allowed (per-entry vs per-item within an entry) and any length or formatting constraints.
- [ ] **Bulk configuration UX**: Clarify how bulk creation/editing of items is exposed (e.g., dedicated “Manage Items” / “Manage Groups” screens vs inline modals within the logging flow).
- [ ] **Search & filtering behavior in pickers**: Define how search/filter behaves when selecting items/groups (case sensitivity, ranking, matching fields, empty-state behavior).
- [ ] **History list presentation**: Specify how log entries are summarized in the main history list (what fields are shown, grouping by day, handling long entries with many items).
- [ ] **Time & timezone rules**: Decide how timestamps are captured (device time vs selectable date/time), whether timezone differences matter, and how edits to the timestamp are handled.
- [ ] **Future analytics requirements (non-UI)**: Capture any must-have metrics or correlation capabilities that could influence how we store log entries and quantifiers (e.g., performance expectations, export formats).

### New Questions from Recent Stories

- [x] **Graph configuration model**: For the MVP, confirm that Bob configures graphs by manually selecting specific items (as in the story), and decide any remaining details such as default date range and how item selection is presented.  
  - Answered in stories: Bob manually selects items to graph, then sees a simple configuration view where he can adjust basic settings such as date range before generating the graph.
- [x] **Graph limits & labeling**: Clarify how many graphs can be open at once and how they are labeled or identified within the UI.  
  - Answered in stories: graphs are named by Bob as he creates them and are listed by name so he can move between them. Stories do not impose a hard numeric limit; implementation can choose reasonable limits based on performance.
- [ ] **Graph output & sharing**: Select a React Native graphing/chart library and, based on its capabilities, define which export formats (e.g., PNG, PDF, SVG) are exposed and how sharing should work, including what metadata (titles, legends, date ranges) must travel with the export.
- [ ] **Sereus node permissions model**: Specify what data each type of node (cadre vs guest) can read/write, and whether Bob can scope which parts of his history or configuration are shared with which nodes.
- [ ] **Node management UX**: Decide how Bob manages nodes in the settings page (renaming nodes, viewing their status/last sync, removing nodes individually or by cohort).
- [ ] **Sync & conflict resolution**: Describe how real-time sync behaves when multiple nodes update the same data (e.g., tie-breaking strategy, eventual consistency expectations, offline edits).

### Possible Future Enhancements (Post-MVP)

- [ ] **Saved/named graph templates**: Allow Bob to save a configured graph (selected items, date range, options) under a name and reopen or tweak it later, instead of recreating it from scratch each time.


