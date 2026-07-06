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
---

# EditEntry Screen Consolidation

## Purpose

Single-screen form to create / edit / clone a log entry, optimized for **fast daily
logging**. The design is **item-first**: after choosing a Type, the user adds items
(searching or creating them on the fly), sets any quantifier values inline, and saves.

> **Design change vs `screens/edit-entry.md` (flagged for human review):** the standalone
> **Category** selector is removed from the entry form. Users think item-first; a Category
> step before items is friction, and the prior build made it *mandatory*, which blocked
> logging when a category had no items. Category now lives (a) as an optional filter inside
> the Item Picker and (b) as a required field only when *creating* a new item. Items are
> selectable across every category of the chosen Type (the single-type rule still holds).

## Route
- `EditEntry` · params `mode` (new | edit | clone), `entryId` (edit/clone).

## Modes
- **new** — Type defaults to last/most-used; items empty; timestamp = now. Title "New Entry".
- **edit** — load by `entryId`, all fields populated, original timestamp. Title "Edit Entry", trash action.
- **clone** — copy type/items/quantifiers/comment; timestamp = now. Title "Clone Entry".

## Layout (single scroll)

### Header
Back (←) · title · trash (edit mode only, confirm).

### 1. Type (required)
Segmented control / selector, single-select — the whole entry is one Type (single-type rule).
Defaults to last/most-used in new mode. A "+ New type" option (in the picker) creates one inline
(rare). Changing Type clears items whose Type no longer matches.

### 2. Items (the core)
- A list of **added items**. Each row: item name · its category (small, muted) · a remove (×), and —
  if the item defines quantifiers — its **inline quantifier inputs** right there (e.g.
  `Stomach pain · Pain     Intensity [ 7 ]`). This is where story 02's "select a 7 for intensity" happens.
- **"+ Add item"** button → opens the **Item Picker**.
- Empty hint: "No items yet — add what you did, felt, or were exposed to."

#### Item Picker (modal)
- Searches **all items + bundles of the selected Type**, across categories (not pre-filtered by category).
- Optional **category filter chips** at the top to narrow/browse a large catalog.
- Rows: item name · category (muted); **bundles badged** (`📦`), showing their members inline.
- **Multi-select** existing rows (checkbox); stays open; **Done** commits.
- **Inline create (required):** when the search text has no exact match, a prominent
  **"+ Create '<query>'"** row appears at the top → opens **Quick-Add Item** (below). The header also
  carries a **(+)** for creating without typing.
- Selecting a **bundle** adds its member items (expanded at save per `logging.md`; kept grouped in the UI
  with the source bundle noted).

#### Quick-Add Item (lightweight sheet — inline creation)
Realizes story 02 (create "stomach pain" with an Intensity quantifier *while logging*) without leaving
the flow:
- **Name** (prefilled from the search query).
- **Category** — pick an existing category of this Type, or **"+ create"** one inline (name only).
- **Quantifiers (optional)** — "+ add quantifier" (name, optional min/max, units) — e.g. Intensity 1–10.
- **More options** → the full `EditItem` screen for advanced editing.
- Save → the item is created in the catalog **and** added to the entry, returning to the picker/entry.
  Idempotent by (category, name).

### 3. Timestamp
"Now" by default, shown as a friendly relative label. Quick-adjust chips (`Now · −1h · Earlier today ·
Yesterday`) for the common recent-past case, plus the **platform-native date/time picker** for precise/
back-dated times. Captured in the device zone, stored UTC + offset (see `general.md` · Time, `rules.md`).

### 4. Comment (optional)
Multi-line free text.

### Footer
Primary **Save / Add Entry / Clone Entry** (label by mode). Enabled when Type + timestamp are set and at
least one item is added (comment-only entries are allowed per `logging.md` — if adopted, relax the item
requirement; current rule requires ≥1 item). On success → back to LogHistory.

## Quantifiers (correctness note)
For every **added** item, the screen loads that item's **quantifier definitions** and renders an input per
definition (numeric, honoring min/max + units; all optional). This must use the item's definitions — not
only values pre-loaded from an existing entry (the prior build only edited pre-loaded values, so
newly-selected items showed no inputs).

## Empty / first-run
- No Types at all → onboarding (handled by the app's first-run gate; the picker offers "Go to Catalog").
- Type has no items → the Item Picker leads with **"+ Create '<query>'"** and a "Go to Catalog" link;
  the user is never dead-ended (this is the bug this redesign fixes).

## Async / activity
Loads (type/category/item stats, quantifier defs) and the save follow `async-activity.md`: `track()`ed for
the global indicator, results applied only if still mounted. Save is a quick write; large inline-create is
rare.

## Data / adapters (`data/editEntry.ts`, `db/*`)
- `getTypeStats()`, `getItemStats(type)` (across categories, most-used first), `getCategoryStats(type)` (for the picker filter + create).
- **`getItemQuantifierDefs(itemIds)`** — quantifier definitions for the added items (the gap to add).
- Quick-Add reuses `db/catalog.ts` upsert (item + category + quantifiers); idempotent.
- `createLogEntry` / `updateLogEntry` / `deleteLogEntry`.

## Screen state
`mode/entryId` · `typeId` · `addedItems: {id,name,categoryName,sourceBundleId?}[]` ·
`quantifierValues: {itemId,quantifierId,value}[]` · `timestamp` · `comment` · picker/quick-add modal state.

## Mock variants
- **happy**: type chosen, a few items across categories, one with a quantifier value.
- **empty**: chosen Type has no items → picker shows "+ Create …" + Go to Catalog.
- **error**: load/save failure → banner + retry.

## i18n keys (delta)
```
editEntry.addItem: "Add item"
editEntry.itemsEmptyHint: "No items yet — add what you did, felt, or were exposed to."
editEntry.pickerCreate: "Create \"{name}\""
editEntry.quickAddTitle: "New item"
editEntry.quickAddCategory: "Category"
editEntry.quickAddCreateCategory: "Create category"
editEntry.quickAddQuantifier: "Add quantifier"
editEntry.quickAddMoreOptions: "More options"
editEntry.removeItem: "Remove"
editEntry.tsNow: "Now"   editEntry.tsMinus1h: "−1h"   editEntry.tsEarlierToday: "Earlier today"   editEntry.tsYesterday: "Yesterday"
```
(existing editEntry.* keys retained; `editEntry.category`/`selectCategory` become picker-internal.)

---
**Status**: Regenerated from scratch — item-first, inline item/category/quantifier creation, multi-category, quantifier inputs for selected items, timestamp quick-chips
**Last Updated**: 2026-07-05
