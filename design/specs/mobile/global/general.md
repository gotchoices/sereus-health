## Sereus Health – General (Mobile)

Cross-cutting behaviors that apply across multiple screens and features.

### First-run / empty database posture

- First-run may start with an **empty database** (no seeded catalog rows and no log entries).
- When empty, primary screens should present a clear “Get started” path:
  - import a starter catalog (e.g. from `health.sereus.org`), or
  - create the first catalog entries manually.

### Time and timestamps (UX rules)

- **Store** timestamps in UTC.
- **Display/edit** timestamps in the device’s local timezone/locale; convert back to UTC for storage.

### Shared UI conventions

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
