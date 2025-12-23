---
provides:
  - screen:mobile:LogHistory
needs:
  - schema:taxonomy
  - schema:logging
dependsOn:
  - design/stories/mobile/01-exploring.md
  - design/stories/mobile/02-daily.md
  - design/stories/mobile/05-cloning.md
  - design/specs/mobile/screens/log-history.md
  - design/specs/mobile/navigation.md
  - design/specs/mobile/global/general.md
  - design/specs/mobile/global/ui.md
  - design/specs/schema/taxonomy.md
  - design/specs/schema/logging.md
---

# LogHistory Screen Consolidation

## Purpose

Primary home screen: show a chronological list of log entries and provide fast access to:
- add a new entry
- clone an entry
- open graphs
- filter/search within history

## UX contract (from human spec)

### Entry card (compact 3-line layout)

- **Line 1**:
  - Type badge (left), date/time immediately after, clone icon at top-right
- **Line 2**:
  - Item/bundle names comma-separated; truncate after 3 items with “+N more”
- **Line 3 (optional)**:
  - Comment snippet, single line, italicized

### Spacing (dense list)

- Card padding: 12px
- Line spacing: 4px
- Card margin-bottom: 8px
- Clone touch target: >= 44pt (use hitSlop)

## Navigation

- **Route**: `LogHistory` (HOME tab root)
- **Actions**:
  - Add → `EditEntry` (mode=new)
  - Clone → `EditEntry` (mode=clone, entryId)
  - Tap entry → `EditEntry` (mode=edit, entryId)
  - Graph icon → `Graphs`

## Data shaping notes

LogHistory only needs a summary per entry:
- `id`
- `timestampUtc` (display in local)
- `type`
- `items[]` + `bundles[]` (names)
- `comment` (optional)

# LogHistory Screen Consolidation

## Purpose
The main entry point and primary screen of Sereus Health. Displays Bob's chronological log of all entries (activities, conditions, outcomes) and provides quick access to core actions: adding new entries, cloning existing ones, and navigating to other major app areas.

## Screen Identity
- **Route**: `LogHistory` (HOME tab root)
- **Title**: "History"
- **Deep Link**: `health://screen/LogHistory?variant={happy|empty|error}`

## User Journey Context
From stories:
- **01-exploring.md**: Bob's first experience after installing—sees mostly empty list with welcome note, discovers "+" to add activity, logs breakfast and exercise.
- **02-daily.md**: Daily logging flow—Bob returns regularly to add conditions and outcomes.
- **05-cloning.md**: Bob frequently uses cloning for repeated entries (same breakfast, regular workout).
- **06-graphing.md**: Starting point for selecting items to graph.

## Layout & Information Architecture

### Header
- **App Title**: "Sereus Health" (centered or left-aligned per platform conventions)
- **Primary Action**: Large, prominent "+" button (top-right) to add new entry
  - Rationale: Stories emphasize Bob immediately noticing the add icon; it should be unmissable
- **Secondary Actions**: 
  - Graph icon (top-right, next to "+") for quick access to graphing interface
  - Filter/search icon (top-right) to toggle filter input visibility

### Main Content Area
- **Filter Bar** (collapsible/toggleable):
  - Text input for live filtering of entries
  - Placeholder: localized "Filter entries..."
  - Clears with "×" button when text present
  - Rationale: Stories 03 and 05 show Bob working with growing lists and needing to locate specific items/groups quickly

- **Entry List** (scrollable, reverse chronological):
  - Each entry card displays:
    - **Date/Time**: Prominent, formatted to device locale
    - **Type Badge**: Subtle color-coded pill (Activity/Condition/Outcome)
    - **Primary Items**: Main items/groups logged (e.g., "Omelette, Toast, OJ" or "BLT")
      - If more than 3-4 items, truncate with "+N more"
    - **Quantifiers Summary**: Brief inline summary if present (e.g., "Intensity: 7")
    - **Comment Snippet**: First ~40 chars of comment if present, faded text
    - **Actions**: 
      - **Clone icon** (right edge): Tappable icon to clone this entry
      - **Tap entire card**: Opens EditEntry in `edit` mode
  - **Empty State**: 
    - Welcome message/illustration
    - Brief onboarding: "Tap + to log your first activity, condition, or outcome"
    - Rationale: Story 01 shows Bob encountering a single welcome note on first launch

### Bottom Navigation (Tab Bar)
- **Home Tab** (current, highlighted)
- **Catalog Tab**: Quick access to ConfigureCatalog
- **Settings Tab**: Access to Sereus connections and other settings
- Rationale: Aligns with navigation.md sitemap; persistent bottom nav is standard RN pattern for multi-section apps

## Interaction Patterns

### Primary Actions
1. **Add New Entry** ("+" button):
   - Navigate to `EditEntry` with `mode=new`
   - No pre-filled data

2. **Clone Entry** (clone icon on card):
   - Navigate to `EditEntry` with `mode=clone&entryId={id}`
   - Story 05: All fields copied except timestamp (set to now)

3. **Edit Entry** (tap card):
   - Navigate to `EditEntry` with `mode=edit&entryId={id}`

4. **Open Graphs** (graph icon):
   - Navigate to `Graphs` screen
   - Story 06: Bob can select items from history or other contexts to generate graphs

5. **Filter Entries** (filter icon / text input):
   - Live client-side filtering by any visible text (date, items, comments)
   - No server round-trip required for MVP

### Navigation
- **Tab Navigation**: Bottom tab bar switches between Home/Catalog/Settings
- **Back Behavior**: At root of HOME tab; Android back button exits app
- **Deep Links**: Support `health://screen/LogHistory?variant={variant}` for testing/scenarios

## Data Model (for this screen)

### LogEntry
```typescript
{
  id: string;
  timestamp: string;          // ISO 8601 UTC
  type: 'Activity' | 'Condition' | 'Outcome';  // or user-defined types
  items: Array<{
    id: string;
    name: string;
    categoryPath: string[];   // e.g., ['Activity', 'Eating']
  }>;
  groups: Array<{
    id: string;
    name: string;
  }>;
  quantifiers: Array<{
    itemId: string;
    name: string;             // e.g., "Intensity", "Duration"
    value: number;
    units?: string;           // e.g., "reps", "minutes"
  }>;
  comment?: string;
}
```

### Screen State
- `entries: LogEntry[]` (loaded from data adapter)
- `filterText: string` (local filter state)
- `loading: boolean`
- `error?: string`

## Mock Variants

### happy
- 10-15 diverse entries spanning activities, conditions, outcomes
- Mix of single items, groups (BLT, breakfast group)
- Various quantifiers (intensity, duration, reps)
- Some with comments, some without
- Demonstrates full feature set in typical daily use

### empty
- Zero user entries (or only system welcome entry)
- Prominent empty state with onboarding message
- Demonstrates first-run experience from story 01

### error
- Simulates data loading failure
- Error banner at top with retry action
- Demonstrates graceful degradation

## Theming & Accessibility
- **Theme**: Follow system light/dark mode (per ui.md)
- **Colors**: 
  - Background: `backgroundLight`/`backgroundDark`
  - Entry cards: `surfaceLight`/`surfaceDark`
  - Text: `textPrimaryLight`/`textPrimaryDark` for main content, `textSecondaryLight`/`textSecondaryDark` for metadata
  - Borders: `borderLight`/`borderDark`
- **Typography**: 
  - Date/time: `body` (16pt, weight 400)
  - Items: `body` (16pt, weight 400)
  - Comment snippet: `small` (12pt, weight 400)
  - Type badge: `small` (12pt, weight 600)
- **Spacing**: Use spec spacing scale [4, 8, 12, 16, 20, 24]
- **Icons**: ionicons (per ui.md)
- **Touch Targets**: Minimum 44×44pt for all interactive elements
- **Accessibility**: 
  - All icons have accessible labels via i18n
  - Entry cards announce type, items, time
  - Filter input has proper label and hint

## i18n Keys (Comprehensive)
```
logHistory.title: "History"
logHistory.appTitle: "Sereus Health"
logHistory.addNew: "Add new entry"
logHistory.openGraphs: "Open graphs"
logHistory.filter: "Filter entries..."
logHistory.clearFilter: "Clear filter"
logHistory.clone: "Clone entry"
logHistory.emptyTitle: "No entries yet"
logHistory.emptyMessage: "Tap + to log your first activity, condition, or outcome"
logHistory.errorLoading: "Failed to load entries"
logHistory.retry: "Retry"
logHistory.itemsMore: "+{count} more"
logHistory.typeActivity: "Activity"
logHistory.typeCondition: "Condition"
logHistory.typeOutcome: "Outcome"
navigation.home: "Home"
navigation.catalog: "Catalog"
navigation.settings: "Settings"
```

## Design Rationale

### Why Bottom Tab Navigation?
- **Standard Pattern**: Bottom tabs are the de facto navigation pattern for React Native apps with 3-5 major sections
- **Story Alignment**: Stories show Bob frequently moving between logging (Home), configuration (Catalog), and later graphing/settings
- **Discoverability**: All major sections visible at a glance; no hidden hamburger menu
- **Thumb-Friendly**: Primary actions (tabs, "+") at bottom and top-right where thumbs naturally rest

### Why Prominent "+" Instead of Text Button?
- **Story Evidence**: "He sees an icon that looks like it can be used to add something. He clicks it." (01-exploring:10)
- **Universal Symbol**: "+" is universally understood for "add new"
- **i18n Friendly**: No text to translate; works in all locales
- **Visual Hierarchy**: Large icon draws eye; logging is the core action

### Why Cards Instead of Simple List Rows?
- **Information Density**: Entries contain multiple dimensions (time, type, items, groups, quantifiers, comments)
- **Scanability**: Cards with clear visual grouping make it easier to distinguish entries at a glance
- **Affordance**: Cards visually suggest tappability for editing
- **Room for Actions**: Clone icon naturally sits at card edge; doesn't crowd content

### Why Clone Icon on Each Card?
- **Story Evidence**: "He notices a way to clone that item so he invokes it" (05-cloning:11)
- **Frequency**: Story 05 suggests cloning becomes Bob's "main version of entering" for repeated items
- **Efficiency**: One-tap access to frequently-used action; no need to open entry first
- **Discoverability**: Visible affordance makes cloning obvious without tutorial

### Why Filter at Top Instead of Search Screen?
- **Story Context**: Bob's catalog grows large (story 03); he needs quick filtering
- **Reduced Friction**: Toggle filter without leaving current context
- **Live Feedback**: Immediate results as user types
- **Simplicity**: No separate search UI needed for MVP

## Component Reuse
- **SelectionList**: Not used on this screen, but entries list follows similar patterns (scrollable, filterable)
- **Shared Dialogs**: Error state could use shared error dialog/toast component
- **Theme Hook**: Uses `useTheme()` to get current palette
- **i18n Hook**: Uses `useT()` for all UI strings

## Open Questions / Future Enhancements
- **Pull-to-refresh**: Should we add pull-to-refresh for manual sync?
- **Infinite scroll / pagination**: At what point do we paginate history? (Not needed for MVP)
- **Multi-select for batch operations**: Future enhancement for bulk delete/export
- **Sync indicator**: Visual feedback when Sereus is syncing (future)

---

**Status**: Fresh consolidation (replaces any prior LogHistory design)
**Last Updated**: 2025-11-29
