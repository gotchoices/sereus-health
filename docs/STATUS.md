## Migration to Appeus-2 (In Progress)

This project is being migrated from Appeus v1 to Appeus v2 to take advantage of improved tooling and generation workflows.

### Migration Checklist

- [x] **Git tag pre-migration state**: Tag as `v0.1-appeus-1-rn` before any migration changes
- [x] **Archive RN v1 code**: Move all React Native app files to `rn-v1/` for future reference
- [x] **Clean appeus-1 artifacts**: Remove appeus-1 symlinks and old AGENTS.md files
- [x] **Strip root to basics**: Keep only `design/`, `docs/`, `mock/`, `README.md`, `.gitignore`
- [x] **Initialize appeus-2 project**: Run `/path/to/appeus-2/scripts/init-project.sh`
- [x] **Review project.md**: Complete `design/specs/project.md` with current decisions
  - Production quality (not MVP)
  - Mobile + Web apps
  - Healthcare professional access via web UI
- [x] **Initialize new mobile app**: Run `./appeus/scripts/add-app.sh --name mobile --framework react-native` (created `apps/mobile`)
- [x] **Reconcile design folder**: Ensure stories/specs fit appeus-2 structure
  - Migrated `design.org/` content into `design/` (stories/specs/generated)
  - Reorganized schema specs from `specs/api/schema.md` into `specs/schema/*.md`
- [ ] **Manual spec review**: Human review all specs for accuracy and completeness
  - [x] `design/specs/project.md`
  - [x] `design/specs/api/schema.md` (data-access contract)
  - [x] `design/specs/schema/index.md`
  - [x] `design/specs/schema/taxonomy.md`
  - [x] `design/specs/schema/bundles.md`
  - [x] `design/specs/schema/logging.md`
  - [ ] `design/specs/mobile/components/index.md`
  - [x] `design/specs/mobile/global/general.md`
  - [x] `design/specs/mobile/global/ui.md`
  - [x] `design/specs/project.md` (mobile toolchain lives here; per-target `toolchain.md` removed)
  - [x] `design/specs/mobile/global/dependencies.md` (likely delete; if any deps are “must-use”, restate elsewhere)
  - [x] `design/specs/mobile/global/inline-taxonomy.md` (deleted; inline-add rules belong in the relevant screen specs if/when desired)
- [x] `design/specs/api/import-export.md`
  - [x] `design/specs/mobile/navigation.md`
  - [ ] `design/specs/mobile/screens/index.md`
  - [ ] `design/specs/mobile/screens/log-history.md`
  - [ ] `design/specs/mobile/screens/edit-entry.md`
  - [ ] `design/specs/mobile/screens/edit-entry-wizard.md` (decide: archive/delete vs merge)
  - [ ] `design/specs/mobile/screens/configure-catalog.md`
  - [ ] `design/specs/mobile/screens/edit-item.md`
  - [ ] `design/specs/mobile/screens/edit-category.md`
  - [ ] `design/specs/mobile/screens/edit-bundle.md`
  - [ ] `design/specs/mobile/screens/sereus-connections.md`
- [x] **Generate fresh scaffold**: Let appeus-2 generate clean app structure (done via `add-app` + baseline slices)
- [x] **Regenerate app code (baseline slices)**: Reconstituted `rn-v1` baseline screens in `apps/mobile` from stories/specs → consolidations → code (LogHistory, EditEntry, ConfigureCatalog, EditItem, EditBundle, Graphs, GraphCreate, GraphView, Settings, SereusConnections, Reminders)
- [ ] **Legacy parity gaps (evaluate vs stories/specs before implementing)**:
  - [ ] **Deep link → navigation**: confirm expected deep link format in `design/specs/mobile/navigation.md` and relevant stories (esp. 08-reminders). Implement end-to-end support for Appeus scenario tooling:
    - [x] **In-app navigation from deep link**: `apps/mobile/App.tsx` now consumes `{route, params}` from `VariantProvider` and routes to the correct screen + params.
    - [x] **Platform URL scheme registration**: iOS + Android register the `health://` scheme so `xcrun simctl openurl` / `adb shell am start -a VIEW -d ...` can launch the app into the route.
  - [ ] **Reminders notifications**: confirm requirements in story 08 + any global specs. If required, implement notification permissions + scheduling/canceling based on “no log entries within interval”, and ensure tapping notification deep-links to `EditEntry` in `new` mode.
  - [ ] **LogHistory import/export**: confirm whether required by `design/specs/api/import-export.md` and/or a story. If required, add CSV export (Share) + CSV import (document picker) to `apps/mobile/src/screens/LogHistory.tsx` and implement adapters in `apps/mobile/src/data/logHistory.ts`.
  - [ ] **ConfigureCatalog import/export**: confirm whether required by stories/specs. If required, add CSV export/import UI to `apps/mobile/src/screens/ConfigureCatalog.tsx` and implement adapter functions in `apps/mobile/src/data/configureCatalog.ts`.
  - [ ] **Settings backup/restore**: confirm whether required by stories/specs. If required, implement full backup export + restore import from Settings (likely JSON), and wire to underlying import functions (catalog + logs).
  - [ ] **Import preview UX (deferred)**: decide whether “preview-before-commit” is a shared modal, a dedicated `ImportPreview` screen, or per-screen UI (LogHistory/ConfigureCatalog/BackupRestore). Defer until after basic export is working.
  - [ ] **Backup status metadata (recommended)**: track “last backup at” and “modified since last backup”, and add guardrails before restore/reset (encourage export first).
  - [ ] **Finalize app ID + scheme**: legacy app used `org.sereus.health` (Android `applicationId`/`namespace`, iOS `PRODUCT_BUNDLE_IDENTIFIER`). Decide whether to keep this for `apps/mobile`, apply it consistently, and document it in `design/specs/project.md` (bundle IDs) and `design/generated/mobile/images/index.md` (scenario capture `appId` + `scheme`).
  - [ ] **EditEntry native date/time picker**: confirm whether required by `design/specs/mobile/screens/edit-entry.md` and/or story behavior. If required, integrate `@react-native-community/datetimepicker` (or approved alternative) and replace current timestamp placeholder UI in `apps/mobile/src/screens/EditEntry.tsx`.
  - [ ] **Persistence layer (beyond mocks)**: confirm target behavior in `design/specs/project.md` + schema specs. Decide storage approach (Quereus vs SQLite/other) and then implement `apps/mobile/src/db/*` + update data adapters to read/write persistent data (not only mock JSON).
  - [ ] **Top-level types are dynamic vs fixed**: reconcile `design/specs/schema/*` + any stories that imply types can be edited/removed. If dynamic, update `apps/mobile` to stop hardcoding `['Activity','Condition','Outcome']` and load types from storage; ensure UI supports type CRUD where specified.
  - [ ] **SereusConnections: copy peer id**: check whether prescribed by Sereus screen spec/stories. If desired, implement copy-to-clipboard UX (use supported RN clipboard lib) for peer id rows.
  - [ ] **SereusConnections: QR scan implementation**: check whether prescribed by specs. If desired, integrate an approved QR scanning approach (camera permissions, scanner UI, parse scanned deep link, confirm-add flow).
  - [ ] **Fastlane (iOS)**: implement iOS fastlane in `apps/mobile/ios/fastlane/` (lanes comparable to legacy Android lanes), using the existing `apps/mobile/Gemfile` fastlane dependency. Reuse the same CI/env-var approach as Android (no secrets committed) and add `build:ios:*` scripts to `apps/mobile/package.json`.
- [ ] **Functional testing**: Verify core workflows with persistent data
- [ ] **Cleanup**: Remove `rn-v1/` once new version is stable and tested

### Things to Consider (Revisit After App Boots)

These are known decisions/inconsistencies that are easier to resolve once the rebuilt app is running and you can see the UX.

- [ ] **Theme on real device**: verify system light/dark switching works on a physical iOS/Android device (emulator/simulator is not reflecting changes reliably).
- [ ] **Theme preferences**: implement a user preference in Settings to select **System | Light | Dark** (override system appearance when chosen).
- [ ] **Defer detailed screen-spec review until the app boots**: once the scaffold runs, re-review `design/specs/mobile/screens/*.md` for correctness and remove stale/over-specified content.
- [ ] **Graphs persistence model**: reconcile whether graphs are ad-hoc (not persisted across restarts) vs saved/named and persisted.
  - Current tension: `design/specs/mobile/navigation.md` vs `design/specs/mobile/global/general.md`.
- [ ] **Inline-create policy**: decide where inline creation is allowed (EditEntry pickers vs Catalog-only vs EditItem-only) and make the relevant screen specs consistent.
- [ ] **EditEntry spec variants**: decide whether to keep `design/specs/mobile/screens/edit-entry-wizard.md` (archive/delete vs merge ideas into `edit-entry.md`).
- [ ] **Catalog tab scope**: confirm whether Catalog is a full manager (current), a read-only browser, or removed in favor of inline editing.
- [ ] **Nested bundles**: schema supports nested bundles, but app-level support must be explicit (read/expand/cycle prevention). Decide whether to support nested bundles in MVP.
- [ ] **Deep link parameter conventions**: normalize param names/types across screens (e.g., `GraphCreate.preselectedItems`, `GraphView.graphId`) once those screens are implemented.
- [ ] **Project spec cleanup**: fix any remaining wording/link nits (e.g., “patient” typo, Quereus link target, HIPAA phrasing) after you confirm the desired messaging.
- [ ] **Generated artifacts policy**: confirm whether `design/generated/mobile/site/` should remain in-repo or be treated as build output.
- [x] **Logo implementation**: implemented app icons for Android + iOS and added in-app header logo.
- [x] **Logo procedure source**: documented in `docs/APP_ICONS.md` and referenced from `design/specs/project.md`.

### RN v1 Archive Location

Original React Native code is preserved in `rn-v1/` for reference during regeneration.

To view old implementation:
```bash
# View structure
ls -la rn-v1/

# View specific file
cat rn-v1/src/screens/EditEntry.tsx
```

## Design Status

This file tracks open design questions for Sereus Health so they can be resolved one at a time.

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

- [x] **Database schema design**: Consolidated into `design/specs/schema/*.md` (authoritative)
  - `schema/taxonomy.md`, `schema/bundles.md`, `schema/logging.md`
  - `specs/api/schema.md` now documents the local “data access” contract (not HTTP)

### Quereus Integration (IN PROGRESS - RN persistent store now working)

**NOTE:** This section reflects a prior/legacy Quereus exploration. `apps/mobile` is now wired to use Quereus with a persistent store backend (`@quereus/store-rn` + `rn-leveldb`). Remaining work is adapter correctness, smoke suite validation, and hardening.

#### Quereus checklist (3 phases)

**Phase 1 — Prove `USE_QUEREUS = true` works (in-memory only).**

Goal: demonstrate stable CRUD + key reads using Quereus **memory** backend, with the UI unchanged.

- [ ] **Re-test Quereus on RN/Hermes (smoke suite)** (Android + Hermes):
  - [ ] **Insert/Select works**: INSERT then SELECT returns rows (no “data disappears”).
  - [ ] **Transactions work**: BEGIN → INSERT → COMMIT, then SELECT returns rows.
  - [ ] **No internal corruption**: no `primaryKeys.add is not a function` (or similar) during inserts.
  - [ ] **Nullable prepared statements**: `prepare().run([... , null , ...])` works for nullable columns (or confirm official workaround).
  - Reference: `docs/quereus-rn-issues.md` for prior repro notes.
- [ ] **Port the working legacy DB layer** into `apps/mobile/src/db/*`:
  - [ ] `index.ts` (singleton DB), `init.ts` (`ensureDatabaseInitialized()`), `schema.ts` (+ seeds)
  - [ ] `logEntries.ts`, `stats.ts`, `catalog.ts` (enough to satisfy current screens)
- [ ] **Dual-backend parity (minimal, end-to-end)** (keep screens unaware; `variant` remains mock-only):
  - [ ] `LogHistory`: Quereus-backed `getLogHistory()` + create/update/delete entry
  - [ ] `EditEntry`: Quereus-backed stats (`getTypeStats/getCategoryStats/getItemStats`) + load-by-id for edit/clone
  - [ ] `ConfigureCatalog` + `EditItem`/`EditBundle`: at least read paths; writes if needed for flows
- [ ] **UUID strategy (recommended to do now if low-friction)**:
  - [ ] Add a single ID helper (UUIDv4/ULID) and use it for all new writes in the Quereus-backed adapters.
  - [ ] Keep mock fixtures as-is unless parity is blocked.
- [ ] **Minimal in-app smoke flow (manual)**:
  - [ ] launch → LogHistory loads
  - [ ] create entry → appears in list
  - [ ] edit entry → persists in-memory
  - [ ] delete entry → disappears
  - [ ] restart app → confirm **expected** loss (in-memory) but no crashes

**Phase 2 — After upgrading to persistent Quereus.**

Goal: validate persistence + stability using a real persistent store backend.

- [x] **Persistence smoke suite**:
  - [x] create entry → restart app → entry still present
  - [x] update entry → restart app → update persists
  - [x] delete entry → restart app → deletion persists
- [x] **Seeding & catalog integrity (idempotency)**:
  - [x] **No duplicate seeds across launches**: cold start app 3x; `types/categories/items/bundles` counts remain stable (no growth).
  - [x] **Seed guard is correct**: confirm the “should we seed?” check reads from a persistent table and is not fooled by initialization order or schema detection (e.g. `schema()` vs `COUNT(*)`).
  - [x] **Constraints actually enforced**:
    - [x] `types.name` unique constraint prevents duplicates
    - [x] `(type_id, name)` uniqueness prevents duplicate categories per type
    - [x] `(category_id, name)` uniqueness prevents duplicate items per category
    - [x] Any observed duplicates have a clear explanation (e.g., different IDs inserted; constraints missing; seeds not matching constraints).
  - [x] **Index creation is idempotent**: verify schema/apply does not re-create indexes or tables on every launch.
- [ ] **Durability / recovery behavior**:
  - [ ] decide + implement UX if DB is not openable or appears corrupted (safe reset vs recover vs read-only mode).
- [ ] **Performance sanity**:
  - [ ] remove N+1 query patterns in the hottest paths (LogHistory list, catalog lists) if needed for real volumes.

#### React Native persistent store module (implemented): `@quereus/store-rn`

Goal: implement a React Native KV-store backend (LevelDB) that can be consumed by `@quereus/plugin-store`'s generic `StoreModule(KVStoreProvider)` without requiring changes to Quereus core or app code other than wiring/registration.

**Approach (preferred)**
- Create a new Quereus package: `quereus/packages/quereus-store-rn/`
  - Publish name: `@quereus/store-rn` (mirrors `@quereus/store-leveldb`, `@quereus/store-indexeddb`)
  - Runtime dependency: `react-native-leveldb` (and any adapter needed) + a minimal RN filesystem/path helper if required
- Implement `KVStore` + `KVStoreProvider` for React Native
- In the app, register the store module:
  - `db.registerVtabModule('store', new StoreModule(provider))`
  - `pragma default_vtab_module = 'store'`
  - Ensure schema is created with `default_vtab_module = 'store'` (or no explicit default + rely on pragma)

**Implementation checklist**
- [x] **Confirm Quereus side API surface**:
  - [x] `@quereus/plugin-store` exports `KVStore`, `KVStoreProvider`, `StoreModule` (RN uses `@quereus/plugin-store/common`)
  - [x] `StoreModule` + `StoreTable` require: ordered iteration with bounds, and atomic-ish `batch().write()`
- [x] **Pick the underlying RN LevelDB implementation**:
  - [x] Use `rn-leveldb` (fork with vendored LevelDB + WriteBatch support)
- [ ] **Define storage location policy (RN)**:
  - [ ] **Android**: internal app storage (e.g. `context.getFilesDir()` or `context.getNoBackupFilesDir()`)
  - [ ] **iOS**: app sandbox non-user-visible directory (e.g. `Library/Application Support/` or `Library/`), not Documents
  - [ ] Decide whether the DB should be included in OS backups (NoBackup vs backed-up)
  - [ ] Define the user-facing “DB reset” strategy (delete store directory)
- [x] **Implement `RNLevelDBStore implements KVStore`**:
  - [x] `open({ path, createIfMissing, errorIfExists })`
  - [x] `get/put/delete/has`
  - [x] `iterate({ gte/gt/lte/lt, reverse, limit })` with correct byte-lexicographic ordering
  - [x] `batch().put/delete/write/clear` (atomic via `WriteBatch`)
  - [x] `close()`
  - [x] `approximateCount()` (fallback count-by-iterate)
- [x] **Implement `RNLevelDBProvider implements KVStoreProvider`**:
  - [x] `getStore(schema, table, options?)` with stable mapping to per-table DB instance/path
  - [x] `getCatalogStore()` for DDL metadata
  - [x] `closeStore()` and `closeAll()`
  - [x] Use one LevelDB instance per table (simpler + matches Quereus expectations)
- [ ] **Add a minimal Node test harness for the provider/store package** (where possible)
  - [ ] If RN-only, ensure the logic is unit-testable (pure functions for key range checks, option parsing)
  - [ ] Add a small RN-side smoke test plan (manual) for: create table → insert → restart → data persists
- [x] **Wire into `apps/mobile` (post-package)**:
  - [x] Add dependency on `@quereus/store-rn`
  - [x] Switch Quereus schema default module to `store` for persistent mode (via pragma)
  - [x] Ensure first-run schema creation and seed logic runs on persistent tables
  - [x] Add a dev-only “Reset DB” action (optional) to delete the store path for debugging (Settings screen)

**Open questions (answer one at a time before coding)**
- [ ] Which RN LevelDB package + adapter is the target, and what APIs does it expose for iteration + batching?
- [x] Do we want the DB included in OS backups (default) or excluded (no-backup directory)?
  - Decision: **include in OS backups by default** (user data); rely on atomic batch semantics for crash consistency.
- [x] Should `@quereus/store-rn` support Node for tests?
  - Decision: **React Native only**. Node already has `@quereus/store-leveldb`.

**Next question (before coding):**
- [x] What will we use to compute the on-device base directory path in React Native (iOS Library/Application Support; Android filesDir)?
  - Decision: start with **`react-native-leveldb`'s built-in base directory** (iOS `NSDocumentDirectory`, Android `filesDir`). No extra path helper needed initially.
  - Note: if we later need finer control (e.g. Application Support vs Documents, or “no-backup”), we can introduce `react-native-fs` and/or an `install(docDir)` override upstream.

**Dependency packaging TODOs (rn-leveldb fork)**

- [ ] **Decide distribution strategy for the fork** (so consumers don’t depend on `prepare` running at install time):
  - [ ] Publish built artifacts to npm (recommended if we want “just works” installs)
  - [ ] Or: create GitHub release/tag that includes built `lib/` outputs
  - [ ] Or: change `"types"` to a committed source entrypoint (no generated `lib/` required)
- [ ] **Eliminate “missing LevelDB sources” installs** (Android CMake expects `cpp/leveldb/CMakeLists.txt`):
  - [ ] Avoid git submodules for LevelDB (vendor a snapshot under `cpp/leveldb/` or move to a fetch-on-build approach)
  - [ ] Or: ensure any GitHub distribution method includes the submodule contents (verify fresh clone + install builds Android)
  - [ ] Add a CI check in the fork: fail fast if `cpp/leveldb/CMakeLists.txt` is missing
  - [ ] Update fork README: call out that upstream uses a LevelDB submodule and what consumers must do if installing from source

**Phase 3 — Defer for later.**

- [ ] **Schema migrations / versioning plan** (and migration tests).
- [ ] **Hardening**: typed storage errors, parity tests, high-volume perf tests, import/export idempotency rules.

#### Spec gaps (not clearly required by current stories/specs)

These items are “engineering baseline” and may merit brief spec notes if you want them to be explicit requirements (otherwise they can be treated as implementation details):

- [ ] **UUID requirement**: specs currently describe IDs, but do not explicitly require UUIDv4/ULID for all entities.
- [ ] **Durability / corruption recovery UX**: no explicit requirement for what the app should do if local storage fails.
- [ ] **Performance targets**: no explicit “must remain fast at N entries” requirement (even a single sentence helps).
- [ ] **Migration posture**: stories/specs do not state how schema evolution should behave for existing users (defer OK, but call it out).

**Current Status:**
- **App runs with `USE_QUEREUS = true`** (Quereus + persistent store)
- **Quereus integration is IN PROGRESS** (remaining UI adapter bugs + broader smoke suite)
- CRUD + persistence verified for catalog + log entries; dev-only Reset DB tool is available

**Notes / prior issues** (see `docs/quereus-rn-issues.md` for details):
- Quereus’s in-memory backend previously showed RN/Hermes incompatibilities (transaction data loss / internal corruption). We are now bypassing that path by using the store-backed module.

**After Quereus RN Support is Fixed (follow-up checklist)**:
- [ ] **Remove/adjust any Quereus RN workarounds** (polyfills/patches) if no longer needed.
- [ ] **Enable + verify**: set `apps/mobile/src/db/config.ts` `USE_QUEREUS = true` and verify:
  - [ ] EditEntry stats queries work
  - [ ] LogHistory queries work
  - [ ] Catalog reads/writes work
  - [ ] Bundle expansion works
  - [ ] Quantifier values work
  - [ ] Basic CRUD is stable across app restarts

### Build & Deployment

- [x] **Create git repo and push**: Initialize git repository and push work to remote.
- [x] **Implement fastlane build system**: Set up fastlane similar to what exists in `devel/mypitch` for automated builds and deployment.
- [x] **Configure real keystore files**: Use real Android keystore files specified by environment variables (not committed to repo).
- [x] **Integrate app logos**: Add app icons/logos for Android and iOS builds.
- [ ] **Verify Quereus integration (after next Quereus release)**: once Quereus is upgraded and the smoke suite passes, confirm running the app with `USE_QUEREUS = true` works end-to-end.

### Features

- [ ] **Log import/export**: Legacy (`rn-v1`) has this; `apps/mobile` does not yet. Evaluate against stories/specs, then decide where it lives (LogHistory menu vs Settings) before implementing.
- [ ] **Catalog import/export**: Legacy (`rn-v1`) has this; `apps/mobile` does not yet. Evaluate against stories/specs before implementing.
- [ ] **Full backup/restore**: Legacy (`rn-v1`) has this; `apps/mobile` does not yet. Evaluate against stories/specs before implementing.

### Possible Future Enhancements (Post-MVP)

- [ ] **Saved/named graph templates**: Allow Bob to save a configured graph (selected items, date range, options) under a name and reopen or tweak it later, instead of recreating it from scratch each time.
- [ ] **AI-assisted insights portal**: Provide an in-app "analysis" or "insights" view where an AI agent can help Bob explore his data (e.g., "what seems correlated with my headaches?") using his stored logs as context.
- [ ] **Built-in statistical/correlation analysis**: Add native statistical tools (e.g., basic correlation, trend detection, comparisons) so Bob can go beyond raw graphs, without exporting to external tools.
