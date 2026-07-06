---
provides:
  - screen:mobile:EditEntry
needs:
  - schema:taxonomy
  - schema:bundles
  - schema:logging
dependsOn:
  - design/stories/mobile/01-exploring.md
  - design/stories/mobile/02-daily.md
  - design/stories/mobile/03-configuring.md
  - design/stories/mobile/04-cloning.md
  - design/specs/mobile/screens/edit-entry.md
  - design/specs/mobile/navigation.md
  - design/specs/mobile/global/general.md
  - design/specs/mobile/global/ui.md
  - design/specs/mobile/global/async-activity.md
  - design/specs/domain/taxonomy.md
  - design/specs/domain/bundles.md
  - design/specs/domain/logging.md
  - design/specs/domain/rules.md
  - design/generated/mobile/components/ComboField.md
---

# EditEntry Screen Consolidation

## Purpose

Single scrollable screen to create / edit / clone a log entry, optimized for fast daily logging.
**Item-first**: pick a Type, then add items — choosing existing ones or creating new ones inline via a
`ComboField` (select-or-create). No modal hops for the common path (only the platform date/time picker).

## Route
- `EditEntry` · params `mode` (new | edit | clone), `entryId` (edit/clone).

## Modes
- **new** — Type defaults to most-used; no items; timestamp = now. Title "New Entry".
- **edit** — load by `entryId`; fields hydrated; original timestamp. Title "Edit Entry"; trash action (confirm).
- **clone** — copy items + quantifier values + comment; timestamp = now. Title "Clone Entry" (story 04).

## Layout (single scroll, `keyboardShouldPersistTaps="handled"`)

### 1. Type (required)
A row of Type chips (Activity / Condition / Outcome, data-driven). Single-select. Changing Type clears the
added items (single-type rule, `domain/rules.md`) — confirm if any were added.

### 2. Items
- **Added items** — one card each: name · its category (muted) · remove (×). If the item defines
  quantifiers, its **inline numeric inputs** appear on the card (e.g. `Stomach pain · Pain  Intensity [7]`).
  This is where story 02's "select a 7 for intensity" happens; values are optional.
- **Add-item field** — a `ComboField` (see its consolidation): tap/chevron drops down existing items of the
  Type (across categories, most-used first, bundles badged `📦`); typing filters; picking adds it. Typing a
  name that doesn't exist offers **"+ Create '<name>'"**, which opens the **inline create draft** below —
  no modal.
- **Inline create draft** (replaces the add field while active): item name (prefilled) · a **Category
  `ComboField`** (pick an existing category of the Type, or type a new one) · an optional quantifier
  (name + optional min/max + units) · **Add** / Cancel. On Add, the item is created in the catalog
  (idempotent by category+name) and added to the entry with its quantifier inputs.

### 3. Timestamp
Shows the local date/time. Quick chips **Now · −1h · Yesterday** for the common recent-past nudge, plus the
**platform-native date/time picker** for precise/back-dated times (Android: date→time; iOS: inline modal).
Stored UTC + captured offset (`general.md` · Time).

### 4. Comment (optional)
Multi-line free text.

### Footer
Primary **Add Entry / Save / Clone Entry** (by mode), enabled when Type + timestamp are set and ≥1 item is
added. On success → back to LogHistory.

## Save semantics
- Each added item → a logged item with its quantifier values.
- A **bundle** is expanded to its member items at save, each tagged with the source bundle (`logging.md`).
- Items are de-duplicated by item id (a bundle member that's also added directly collapses to one row).

## Async / activity
Loads (type stats, items/categories for the Type, quantifier defs) and the save are `track()`ed for the
global indicator; results applied only if still mounted (`async-activity.md`). Items and categories load
independently so one failing doesn't blank the other.

## Data / adapters (`data/editEntry.ts`, `db/*`)
- `getTypeStats()` · `getItemsForType(typeId)` (items across categories + bundles, most-used first) ·
  `getCategoriesForTypeName(typeName)` (draft category options).
- `getItemQuantifiers(itemId)` — definitions for an added item's inline inputs.
- `createInlineItem({ typeName, categoryName, name, quantifiers })` — idempotent create-on-the-fly.
- `getBundleItemIds(bundleId)` — expansion at save.
- `getEditEntry` (rich item hydration for edit/clone) · `createLogEntry` / `updateLogEntry` / `deleteLogEntry`.

## Screen state
`typeId` · `addedItems: {id,name,categoryName,isBundle,quantifiers,values}[]` · `draft` (in-progress new item) ·
`typeItems` · `typeCategories` · `timestamp` · `comment`.

## Mock variants
- **happy**: a Type chosen, items across categories, one with a quantifier value.
- **empty**: chosen Type has no items → item field drops "No matches — type to create one" + "+ Create".
- **error**: load/save failure → banner.

## i18n keys (delta)
```
editEntry.addItem / addItemPlaceholder / itemsEmptyHint
editEntry.pickerCreate ("Create '{name}'") / draftQuantifierPlaceholder / quickAddCategory
editEntry.tsNow / tsMinus1h / tsYesterday
combo.create / combo.empty
```
(existing editEntry.* / editItem.* keys reused.)

---
**Status**: Regenerated to shipped UI — item-first, inline ComboField select-or-create, inline create draft (no modals), quantifier inputs, timestamp chips, bundle expansion
**Last Updated**: 2026-07-05
