## Sereus Health – General (Mobile)

Cross-cutting behaviors that apply across multiple screens and features.

### First-run / empty database posture

- First-run may start with an **empty database** (no seeded catalog rows and no log entries).
- When empty, primary screens should present a clear “Get started” path:
  - import a starter catalog, or
  - create the first catalog entries manually.

### Starter catalogs & getting started

On first run (empty database), the app presents a clear “get started” choice — see story `01-exploring.md`. Three paths:

- **Import from sereus.org**: browse the catalogs published at `sereus.org/health` and pick one by size (**Minimal / Small / Medium / Large** — progressively more food items). The app fetches the chosen canonical catalog and imports it, with preview-before-commit per `import-export.md`.
- **Import from a file**: open a canonical catalog file (`.yaml` / `.yml` / `.json`) from device storage via the OS file picker, then import it (preview-before-commit).
- **Start from scratch**: skip importing and begin creating catalog entries by hand.

Catalogs are **fetched, not bundled** — `sereus.org/health` is the single source of truth, so catalogs can be updated without an app release. When offline, “Import from sereus.org” is unavailable; “Import from a file” and “Start from scratch” still work.

### Time and timestamps (UX rules)

- **Store** each entry’s timestamp as a UTC instant, plus the local offset in effect where/when it was logged.
- **Display** entries in their originating timezone (the zone they were logged in), not the viewer’s current device zone, so times don’t shift when you travel.
- **Create/edit** in the device’s current local timezone; convert back to UTC (with the current offset) for storage.

### Shared UI conventions

- **Inline creation (app-wide)**: wherever a screen asks the user to *select* a catalog entity (a Type, Category, Item, bundle member, or quantifier), it must also let the user *create* one on the fly — typically via a “+ Create ‘<typed name>’” row in the picker — without leaving the current task. The new entity is persisted to the catalog immediately and selected. Explicit bulk management still lives in the Catalog screens.
- **Reusable selection list**: a shared list picker that supports optional filtering and single/multi-select, reused across screens.
- **Shared dialogs/toasts**: confirmation dialogs and transient notifications are shared components/styles, not one-offs.
- **Bottom tab bar**: when present, it is visually pinned to the bottom of the screen; scrollable content must not push it upward (content area scrolls above it).

### Filters (search toggles)

For screens that expose a toggleable search/filter bar:

- Tapping the search icon **reveals** the filter input.
- Typing into the input **filters the list live**.
- Tapping the search icon again **hides** the filter input.
- When hidden, the **typed filter value is retained**, but the **list is not filtered**.
- Re-opening the filter input restores the previous value and **re-applies** filtering (until the value is cleared).

### Date/time picker guidance

- Use platform-native date/time picker UX; keep picker presentation consistent (modal/inline with confirm/cancel).

### Assistant
 The assistant UX is implemented as a reusable component: see [`mobile/components/assistant.md`](../components/assistant.md).
- Initial implementation: **screen-only**, accessible from the global menu (bottom tab bar), not an overlay.
