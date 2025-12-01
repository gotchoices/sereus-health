## Design Status

This file tracks open design questions for Diario so they can be resolved one at a time.

### Open Questions / TODOs

- [ ] **Correlations & insights UX**: Decide how Bob reviews his data to “assess health” beyond the basic graphing story (e.g., filters such as “what usually precedes stomach pain?”, comparison views, saved queries, prebuilt graph templates).
- [x] **Top-level type semantics**: Clarify whether `Activity`, `Condition`, and `Outcome` are fixed top-level types or whether users can define additional top-level types (e.g., `Medication`), and how these are presented in the UI.  
  - Answered in `02-daily.md`: Bob can edit or delete these categories and use other top-level categories instead.
- [x] **Category hierarchy & naming**: Define the allowed hierarchy (type → category → item → group), whether deeper nesting is allowed, and naming rules (e.g., can items belong to multiple categories? can groups be nested?).
- [x] **Taxonomy lifecycle (edit/delete behavior)**: Decide how editing or deleting categories, items, groups, and quantifiers should behave when existing log entries reference them (e.g., rename only, soft delete with retention, hard delete constraints).
- [x] **Scope & sharing of definitions**: Determine whether items, groups, and categories are per-user only or whether there are global/shared templates or presets, and how ownership/visibility works.
- [x] **Quantifier types & constraints**: Enumerate supported quantifier types, allowed ranges/validation, and defaults for newly created quantifiers.
- [x] **Quantifier attachment model**: Confirm whether quantifiers are defined per-item, per-category, or both.
- [x] **EditEntry flow structure**: Decided: Single screen with modal pickers (Option C). Next: Create `specs/screens/EditEntry.md` detailing the modal picker pattern, field layout, validation, and behavior for new/edit/clone modes.
- [ ] **Comment/notes support**: Specify where free-form comments are allowed (per-entry vs per-item within an entry) and any length or formatting constraints.
- [ ] **Catalog screen purpose & scope**: Stories show all item/group creation happening inline during EditEntry flow. Decide: (A) Keep ConfigureCatalog as separate bulk manager, (B) Make it read-only browser, or (C) Remove Catalog tab entirely and do everything inline. Update navigation.md accordingly.
- [ ] **Inline taxonomy creation in EditEntry**: Stories 01, 02, 03 show Bob adding items/groups while logging. Specify how "Add new item" / "Create group" links/buttons work within EditEntry's modal pickers (inline forms, nested modals, navigation to Catalog?).
- [ ] **Search & filtering behavior in pickers**: Define how search/filter behaves when selecting items/groups (case sensitivity, ranking, matching fields, empty-state behavior).
- [ ] **History list presentation**: Specify how log entries are summarized in the main history list (what fields are shown, grouping by day, handling long entries with many items).
- [x] **Time & timezone rules**: Decide how timestamps are captured (device time vs selectable date/time), whether timezone differences matter, and how edits to the timestamp are handled.
- [ ] **Future analytics requirements (non-UI)**: Capture any must-have metrics or correlation capabilities that could influence how we store log entries and quantifiers (e.g., performance expectations, export formats).

### New Questions from Recent Stories

- [x] **Graph configuration model**: For the MVP, confirm that Bob configures graphs by manually selecting specific items (as in the story), and decide any remaining details such as default date range and how item selection is presented.  
  - Answered in stories: Bob manually selects items to graph, then sees a simple configuration view where he can adjust basic settings such as date range before generating the graph.
- [x] **Graph limits & labeling**: Clarify how many graphs can be open at once and how they are labeled or identified within the UI.  
  - Answered in stories: graphs are named by Bob as he creates them and are listed by name so he can move between them. Stories do not impose a hard numeric limit; implementation can choose reasonable limits based on performance.
- [ ] **Graph library selection & GraphView spec**: Select a React Native graphing/chart library and create `specs/screens/GraphView.md` detailing: display/interaction (zoom, pan, legend), graph types (line/bar/scatter), export formats available, and sharing workflow.
- [ ] **GraphCreate screen spec**: Create `specs/screens/GraphCreate.md` detailing: item picker UI (reuse SelectionList?), date range picker, graph name input, and generate flow.
- [ ] **Notification/reminder system spec**: Create `specs/screens/Reminders.md` or add to `specs/global/general.md`: notification permissions, scheduling logic, deep link handling when tapping notification, background task requirements.
- [x] **Sereus node permissions model**: Specify what data each type of node (cadre vs guest) can read/write, and whether Bob can scope which parts of his history or configuration are shared with which nodes.  
  - Answered (initial model): Bob, as owner of his database, ultimately controls permissions on his own data. By default, guest nodes such as his doctor’s node are allowed to **read** his data so they can review his progress; stories do not rely on guests writing to Bob’s data. Finer-grained read/write controls can be added later via schema-level permissions without changing current stories.
- [x] **Settings screen structure**: Decided: `Settings` root screen with list of sections (Sereus, Reminders, future: AI/Preferences/About). Each section pushes to dedicated screen. Next: Update `specs/navigation.md` and create screen specs.
- [ ] **Settings screen spec**: Create `specs/screens/Settings.md` detailing: section list layout, future extensibility (AI, Preferences, Data Management, About).
- [ ] **SereusConnections screen spec**: Create `specs/screens/SereusConnections.md` detailing: QR scanning flow, node list display (cadre vs guest), node management (rename, status, remove), and add-node prompts.
- [x] **Sync & conflict resolution**: Describe how real-time sync behaves when multiple nodes update the same data (e.g., tie-breaking strategy, eventual consistency expectations, offline edits).

### Schema & Data Model

- [x] **Database schema design**: Updated `specs/api/schema.md` with refined design:
  - Flat categories (no hierarchy for MVP)
  - Bundles expand to items at log time (immutable historical snapshot)
  - Quantifiers are properties of item definitions (shown for all selected items)
  - Single-type entries (validated)
  - 9 tables with detailed examples, constraints, and rationale
  - Ready for Quereus implementation

### Quereus Integration (Completed - Basic Read/Write)

- [x] **Add Quereus dependency**: Installed `@quereus/quereus@^0.4.11`
- [x] **Create database initialization**: `src/db/index.ts` with Database instance, MemoryTableModule registration, and default pragmas
- [x] **Translate schema to declarative SQL**: Created `src/db/schema.ts` with full declarative schema matching `design/specs/api/schema.md`
- [x] **Apply schema with seed data**: App initializes DB on startup with seed data (types, categories, items, quantifiers, bundles, welcome note)
- [x] **Replace EditEntry stats adapters**: Created `src/db/stats.ts` with SQL-based `getTypeStats`, `getCategoryStats`, `getItemStats`, `getMostCommonType`, `getMostCommonCategory`
- [x] **Implement CRUD for log entries**: Created `src/db/logEntries.ts` with `createLogEntry`, `updateLogEntry`, `deleteLogEntry`, `getAllLogEntries`, `getLogEntryById`
- [x] **Update LogHistory adapter**: Updated `src/data/logHistory.ts` to use SQL queries via `getAllLogEntries()`
- [ ] **Test full flow**: Add entry → Save → View in history → Edit → Delete (ready for manual testing)
- [ ] **Verify constraints**: Test FK constraints, unique constraints, CHECK constraints work as expected (ready for manual testing)

**Next Steps:**
- Manual testing of full CRUD flow
- Wire up EditEntry save functionality to use `createLogEntry`/`updateLogEntry`
- Test constraint validation (e.g., single-type entries, FK integrity)
- Consider AsyncStorage persistence (post-testing)

### Possible Future Enhancements (Post-MVP)

- [ ] **Saved/named graph templates**: Allow Bob to save a configured graph (selected items, date range, options) under a name and reopen or tweak it later, instead of recreating it from scratch each time.
- [ ] **AI-assisted insights portal**: Provide an in-app “analysis” or “insights” view where an AI agent can help Bob explore his data (e.g., “what seems correlated with my headaches?”) using his stored logs as context.
- [ ] **Built-in statistical/correlation analysis**: Add native statistical tools (e.g., basic correlation, trend detection, comparisons) so Bob can go beyond raw graphs, without exporting to external tools.
