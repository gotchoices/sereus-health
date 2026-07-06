---
provides:
  - component:mobile:ComboField
dependsOn:
  - design/specs/mobile/global/general.md
  - design/specs/mobile/global/async-activity.md
---

# ComboField Component Consolidation

## Purpose

The app's **select-or-create** primitive (realizes `general.md` · Inline creation). A single-line text
field with an inline dropdown: the chevron (or focusing) reveals existing options; typing filters them;
a value that doesn't exist offers **"+ Create '<text>'"**. Everything stays on the current screen — no
modal. Used for the item and category fields in EditEntry (and intended for EditBundle).

## Behavior

- **Always opens on focus** so the chevron/tap gives visible feedback — the existing options, a create
  row, or a **"No matches — type a name to create one"** hint. Never silently does nothing.
- **Chevron** toggles the dropdown (focus/blur). The whole row is reachable; taps work while the keyboard
  is up (host screen sets `keyboardShouldPersistTaps="handled"`).
- **Filter** as you type; options may carry a muted sublabel (e.g. an item's category).
- **Create row** appears when `onCreate` is provided, the text is non-empty, and no option matches exactly.

## Two modes

- **Adder** (default): after a pick/create it clears itself, so it can add repeatedly (the EditEntry
  item field adds several items to one entry).
- **Value** (pass `value` + `onChangeText`): holds a single value that it displays (the create-draft's
  Category field). Picking fills the value; typing sets it directly (get-or-created on save).

## Props (shape)
`placeholder` · `options: {id,label,sublabel?}[]` · `onSelect(opt)` · `onCreate?(text)` ·
`createLabelKey?` (i18n key receiving `{name}`) · `value?` + `onChangeText?` (value mode) · `autoFocus?` · `max?`.

## Notes
- Purely presentational: it does not fetch. The host loads `options` (typically `track()`ed per
  `async-activity.md`) and performs the create in `onCreate`.
- Supersedes the earlier modal `ItemPicker`/`QuickAddItem` approach.

---
**Status**: Generated (new) — reusable inline select-or-create widget
**Last Updated**: 2026-07-05
