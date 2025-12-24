## Sereus Health – General (Mobile)

Cross-cutting behaviors and assumptions that apply across multiple screens and features.

### Data, Sync, and Ownership

- **Source of truth**: persisted app data lives in the underlying data layer and is treated as authoritative; UI state is a cache/interaction layer.
- **Sync**: replication/conflict handling is owned by the underlying sync layer; the app should not invent per-record conflict UI for MVP.
- **Ownership & permissions (initial model)**:
  - Bob controls access to his data.
  - Guest nodes (e.g., doctor) are assumed **read-only** for MVP unless a screen spec states otherwise.

### Schema source of truth

All entity/table details (taxonomy, bundles, logging, quantifiers) live in:

- `design/specs/schema/taxonomy.md`
- `design/specs/schema/bundles.md`
- `design/specs/schema/logging.md`

This file should not restate schema.

### Taxonomy lifecycle (UX rules)

When a user edits a taxonomy element that is already referenced by historical log entries:

- **Ask scope**: “Apply to all existing entries” vs “Future only”.
- **Future only**: create a new definition for future use; existing entries remain attached to the old definition.
- **Deletion**: if in use, prefer “retire/hide from future use” over hard delete (and communicate impact clearly).

### Time and timestamps (UX rules)

- **Store** timestamps in UTC.
- **Display/edit** timestamps in the device’s local timezone/locale; convert back to UTC for storage.

### Graphing (until screen specs exist)

- Graphs are **ad-hoc** in MVP (generated from manual item selection) and **not persisted across app restarts** unless a future screen spec says otherwise.

### Shared UI conventions

- **Reusable selection list**: a shared list picker that supports optional filtering and single/multi-select, reused across screens.
- **Shared dialogs/toasts**: confirmation dialogs and transient notifications are shared components/styles, not one-offs.

### Filters (search toggles)

For screens that expose a toggleable search/filter bar:

- Tapping the search icon **reveals** the filter input.
- Typing into the input **filters the list live**.
- Tapping the search icon again **hides** the filter input.
- When hidden, the **typed filter value is retained**, but the **list is not filtered**.
- Re-opening the filter input restores the previous value and **re-applies** filtering (until the value is cleared).

### Theming

- Default to **system light/dark**; layouts must remain legible in both.

### Date/time picker guidance

- Use platform-native date/time picker UX; keep picker presentation consistent (modal/inline with confirm/cancel).

### i18n and iconography

- All user-facing strings go through i18n from day one (e.g., `useT()`), not hard-coded literals.
- Prefer self-explanatory icons where appropriate; otherwise pair icons with labels and accessible descriptions.


