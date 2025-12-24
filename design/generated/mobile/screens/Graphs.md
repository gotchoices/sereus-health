---
provides:
  - screen:mobile:Graphs
needs:
  - screen:mobile:GraphCreate
  - screen:mobile:GraphView
dependsOn:
  - design/stories/mobile/06-graphing.md
  - design/specs/mobile/navigation.md
  - design/specs/mobile/screens/index.md
  - design/specs/mobile/global/general.md
  - design/specs/mobile/global/ui.md
---

# Graphs Screen Consolidation

## Purpose
Browse and manage Bob's collection of saved/named graphs. Acts as the hub for all graphing functionality—creating new graphs, viewing existing ones, and sharing them.

## Screen Identity
- **Route**: `Graphs` (push from LogHistory)
- **Title**: "Graphs"
- **Deep Link**: `health://screen/Graphs?variant={happy|empty}`

## User Journey Context
From stories:
- **06-graphing.md**: Bob creates multiple graphs of various outputs and inputs. Each graph gets a short name. He can see all his graphs by name, move between them without losing any, and share them.

From general.md:
- **Graph persistence**: Graphs are **ephemeral** in MVP—they exist while the app is running and remain until explicitly closed or app terminates. They don't persist across app restarts.

## Layout & Information Architecture

### Header
- **Back Button** (left): Returns to LogHistory
- **Title**: "Graphs" (centered)
- **Create Button** (right): "+" icon to create new graph
  - Navigates to `GraphCreate` screen

### Main Content Area

#### Graph List (when graphs exist)
- **Scrollable list of graph cards**, each showing:
  - **Graph Name**: User-assigned name (prominent)
  - **Items Summary**: Brief list of items included (e.g., "Headache, Stomach Pain, Peanuts")
  - **Date Range**: "Nov 1 - Nov 30, 2025" or similar
  - **Close/Delete Icon**: "×" to dismiss graph from list
- **Tap card**: Opens `GraphView` for that graph

#### Empty State (no graphs yet)
- **Icon**: `stats-chart-outline` (large, centered)
- **Title**: "No graphs yet"
- **Subtitle**: "Create your first graph to visualize trends in your data"
- **CTA Button**: "Create Graph" button → navigates to GraphCreate

### No Bottom Tab Bar
- This screen is pushed onto HOME stack from LogHistory
- Uses standard back navigation, not tab switching

## Interaction Patterns

### Primary Actions
1. **Create New Graph** ("+" button or CTA):
   - Navigate to `GraphCreate`
   - Returns here after graph is generated

2. **View Graph** (tap card):
   - Navigate to `GraphView` with `graphId`
   - Can share from there

3. **Close/Delete Graph** ("×" on card):
   - Removes graph from ephemeral list
   - No confirmation needed (ephemeral nature)
   - Story: "they do not go away until he explicitly closes/dismisses them"

### Navigation
- **Back**: Returns to LogHistory
- **Deep Links**: `health://screen/Graphs?variant={variant}`

## Data Model

### Graph (ephemeral, in-memory)
```typescript
interface Graph {
  id: string;                    // Generated UUID
  name: string;                  // User-assigned name
  createdAt: string;            // ISO 8601 timestamp
  items: Array<{
    id: string;
    name: string;
    category: string;
  }>;
  dateRange: {
    start: string;              // ISO 8601 date
    end: string;                // ISO 8601 date
  };
  // Graph data/image cached here or regenerated on view
}
```

### Screen State
```typescript
interface GraphsState {
  graphs: Graph[];              // Ephemeral list, lives in app state
  loading: boolean;
  error?: string;
}
```

## Mock Variants

### happy
- 3-4 sample graphs with distinct names:
  - "Headache Triggers" - Headache, Peanuts, Chocolate (Nov 1-30)
  - "Exercise Effects" - Running, Weights, Energy Level (Oct 15 - Nov 15)
  - "Food & Stomach" - Stomach Pain, Breakfast items (Last 7 days)
- Demonstrates typical usage after Bob has created several graphs

### empty
- Zero graphs
- Shows empty state with "Create Graph" CTA
- Demonstrates first-time experience

## Theming & Accessibility
- **Theme**: Follow system light/dark mode
- **Colors**: 
  - Background: `theme.background`
  - Cards: `theme.surface` with `theme.border`
  - Text: `theme.textPrimary` for names, `theme.textSecondary` for metadata
  - Accent: `theme.accentPrimary` for create button
- **Typography**:
  - Graph name: `typography.body` with fontWeight 600
  - Items/date: `typography.small`
- **Touch Targets**: Minimum 44×44pt
- **Accessibility**: Cards announce graph name, items count, date range

## i18n Keys
```
graphs.title: "Graphs"
graphs.createGraph: "Create Graph"
graphs.emptyTitle: "No graphs yet"
graphs.emptyMessage: "Create your first graph to visualize trends in your data"
graphs.closeGraph: "Close graph"
graphs.itemsCount: "{count} items"
graphs.dateRange: "{start} - {end}"
```

## Design Rationale

### Why Ephemeral Graphs?
- **MVP Simplicity**: Avoids database schema for graph storage
- **Story Aligned**: Bob creates graphs for immediate analysis/sharing, doesn't necessarily need them to persist
- **Easy Cleanup**: No stale data accumulation

### Why Card Layout?
- **Scannable**: Quick visual distinction between graphs
- **Tappable**: Clear affordance for opening detail view
- **Consistent**: Matches card pattern used in LogHistory

### Why Close Icon on Cards?
- **Story Evidence**: "they do not go away until he explicitly closes/dismisses them"
- **Direct Manipulation**: One-tap removal without navigation

## Component Reuse
- **Theme Hook**: `useTheme()` for current palette
- **i18n Hook**: `useT()` for all UI strings
- **Card Component**: Could share with LogHistory entry cards

## Open Questions / Future Enhancements
- **Graph Persistence**: Post-MVP could add database storage for favorite graphs
- **Graph Templates**: Save configuration without data for reuse
- **Sorting/Filtering**: As graph count grows, may need organization

---

**Status**: Fresh consolidation
**Last Updated**: 2025-12-03

