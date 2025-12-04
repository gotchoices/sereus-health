## Sereus Health – General Specs

These are cross-cutting behaviors and assumptions that apply across multiple screens and features.

### Storage and Fabric

- **Sereus fabric and SQL**  
  - Sereus Health runs on top of Sereus fabric; user data is stored in an SQL database built on the user’s cadre of Sereus nodes.  
  - Application data such as log entries, taxonomy (types, categories, items, bundles), quantifier definitions, and app settings should be modeled in this SQL layer so that it can be synced across nodes.
  - In-app state management (e.g., React/React Native state, optional Redux) should treat Sereus/SQL as the source of truth for persisted data, with local state acting as a cache/interaction layer.

- **Ownership and permissions (initial model)**  
  - Bob, as the owner of his database, ultimately controls permissions on his own data across his cadre and guest nodes.  
  - For the initial implementation, guest nodes such as a doctor’s node are assumed to have **read access** to Bob’s relevant data so they can review his progress; stories do not depend on guests writing to Bob’s data.  
  - More granular read/write and scope controls (e.g., restricting certain tables or ranges) can be introduced later at the schema/SQL level without changing the current user stories.

### Scope and Sharing of Definitions

- All taxonomy definitions (types, categories, items, bundles, quantifiers) and configuration live in a **single-user database** that serves only Bob.  
- There are no global or cross-user template catalogs in the initial design; any presets or frequently used items exist within Bob’s own data.  
- Sharing via Sereus nodes operates at the level of Bob’s database being replicated to his cadre/guest nodes, not at the level of shared definition libraries across users.

### Categories, Items, and Bundles

- **Category structure**  
  - Each **item** belongs to exactly **one category**.  
  - Categories are **flat** (no hierarchy in MVP): each category belongs to one type.
  - Types → Categories → Items (2-level structure).
  - See `specs/api/schema.md` for details.

- **Bundles**  
  - Bundles are named collections that can contain **items and other bundles**, allowing nested groupings where helpful (e.g., a "Breakfast" bundle that includes other meal bundles and individual items).  
  - **Expansion at log time**: When logging a bundle, it expands to individual items and stores those items (immutable snapshot).
  - See `specs/api/schema.md` for storage details and rationale.

### Quantifiers

- **Definition and attachment**  
  - Quantifiers are defined **per item**. Each item may define zero or more quantifiers (for example, a headache item might have both an “Intensity” and a “Duration” quantifier).  
  - When defining or editing an item, the user can add, edit, or remove its quantifiers; these quantifiers then appear as fields when logging that item.

- **Quantifier type (MVP)**  
  - For the MVP, quantifiers are modeled as a general **numeric** type with optional constraints:  
    - Optional **minimum** and **maximum** values (to support bounded scales such as 1–10 intensity).  
    - Optional **units** string (for display only), such as `reps`, `minutes`, `miles`, `glasses`.  
  - This single numeric representation is intended to cover integers, bounded scales, durations, distances, and other simple numeric measures, while keeping the schema and UI flexible.

### Taxonomy Lifecycle (Initial Behavior)

- **Editing existing definitions**  
  - When Bob edits a taxonomy element that is already referenced by log entries (such as an item, bundle, category name, or one of its quantifiers), the app should treat this as a potentially breaking change.  
  - The preferred behavior is to **ask Bob whether the change should apply to all existing entries or only to future entries** that use this definition.
  - If Bob chooses to apply the change **only to future entries**, the system should effectively create a new definition (e.g., a new item record) and route future log entries to that new definition, leaving historical entries attached to the original definition.
  - If Bob chooses to apply the change to **all entries**, the system is allowed to update the existing definition in place; historical entries referencing it will now reflect the updated definition.

- **Deletion**  
  - Deletion rules can follow the same spirit: for elements that are already in use, the app should either prevent hard deletion or clearly communicate that removing the definition will affect existing entries, and may instead offer a “retire/hide from future use” option in the UI.

### Time and Timestamps

- Sereus Health uses the Quereus timestamp type for all persisted times in the database.  
- All stored timestamps are normalized to **UTC**.  
- On Bob’s device, timestamps are displayed in the device’s **local timezone and locale** (date/time formatting) so they match what he expects from his phone/OS.  
- When Bob edits a timestamp in the UI (for example, adjusting the time of a past log entry), the controls operate in local time and the result is converted back to UTC for storage.

### Sync and Consistency

- Sereus is responsible for handling node contention, replication, and conflict resolution across Bob’s cadre and guest nodes.  
- Sereus Health can treat the underlying Quereus/SQL database as a **logically consistent SQL store**, without implementing its own per-record conflict resolution UI.  
- From the app’s perspective, reads and writes go against a consistent database view; any low-level reconciliation between nodes happens within Sereus.

### Graphing (MVP)

- **Graph creation**  
  - For the MVP, Bob configures graphs by manually selecting specific items (as described in the “Graphing the Data” story) and then invoking a graphing action.
  - Additional presets or saved/named graph templates are considered post-MVP and are tracked in `docs/STATUS.md`.

- **Graph persistence**  
  - Graphs created by Bob are **ephemeral** in the MVP: they exist while the app is running and remain available until he explicitly closes/dismisses them or the app is fully terminated.  
  - After a full app restart, previously created graphs do not automatically reappear; Bob can recreate them by selecting items again and generating new graphs.

### UI Components and Reuse

- **Selection list widget**  
  - The app should provide a **reusable selection list component** built from core React Native primitives (e.g., `FlatList` + `TextInput`).  
  - This widget supports:  
    - Displaying a scrollable list of items.  
    - An optional **filter input** to narrow visible rows.  
    - Configurable **selection mode**: single-select or multi-select (e.g., via checkboxes or row highlighting).  
  - The same widget (or its small variants) is reused wherever Bob needs to pick from lists: main history list selection (e.g., for cloning), choosing categories/items/bundles, composing bundles, etc., rather than inventing bespoke list UIs per screen.

- **Dialogs, popups, and toasts**  
  - Confirmation dialogs, alerts, and transient notifications (toasts/snackbars) should be implemented as **shared components/styles** and reused across screens.  
  - Individual screens may trigger these shared components but should not introduce one-off, screen-specific dialog or toast implementations.

### Theming

- Sereus Health should **default to the device's system appearance settings** (light/dark) and follow them where possible, rather than forcing a theme globally.  
- Screen layouts and colors should be implemented so they remain legible and pleasant in both light and dark modes; any deviations from system theme should be called out explicitly in screen specs.

### Internationalization and Iconography

- **Internationalization (i18n)**  
  - From the onset, all user-facing UI strings (button labels, headings, helper text, errors) should be provided via a translation mechanism (e.g., a `useT()` / `t()` hook) rather than hard-coded English literals in components.  
  - Mock data (sample item names, example foods, comments) can remain in English for now, but UI chrome and feature labels should be locale-sensitive.

- **Icons vs text**  
  - Where an icon is **self-explanatory** (e.g., a prominent “+” for adding a new entry), prefer the icon over text-only buttons to reduce language dependence.  
  - When an icon might be ambiguous, pair it with a translatable label or accessible description so the intent remains clear across locales.


