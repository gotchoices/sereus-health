# GraphCreate Screen Consolidation

---
provides: ["screen:GraphCreate"]
needs: ["screen:GraphView"]
dependsOn:
  - design/stories/06-graphing.md
  - design/specs/navigation.md
  - design/specs/screens/index.md
  - design/specs/global/general.md
---

## Purpose
Configure and generate a new graph by selecting items to track and setting date range. This is where Bob picks what to visualize before seeing the actual graph.

## Screen Identity
- **Route**: `GraphCreate` (push from Graphs)
- **Title**: "Create Graph"
- **Deep Link**: `health://screen/GraphCreate?preselectedItems={ids}`

## User Journey Context
From stories:
- **06-graphing.md**: 
  - "He finds a couple outcomes including his headaches and stomach pain" - multi-select items
  - "He also finds a few foods he suspects could be causing inflammation (peanuts, chocolate)" - cross-category selection
  - "A simple configuration view allows him to adjust a few basic settings such as the date range"
  - "As he creates each graph, he gives it a short name so he can recognize it later"

## Layout & Information Architecture

### Header
- **Back Button** (left): Returns to Graphs list
- **Title**: "Create Graph" (centered)
- **Generate Button** (right): Disabled until items selected; initiates graph generation

### Main Content Area

#### Graph Name Input
- Text input for user-assigned name
- Placeholder: "Graph name..."
- Required before generating

#### Item Selection Section
- **Section Header**: "Select Items" with item count badge
- **Scrollable multi-select list** of all loggable items:
  - Grouped by category for easier browsing
  - Checkbox on each item row
  - Filter input at top to search items
  - Shows item name and category
- **Empty state**: "No items available" (if catalog is empty)

#### Date Range Section
- **Section Header**: "Date Range"
- **Preset options** (quick selection):
  - "Last 7 days" | "Last 30 days" | "Last 90 days" | "All time"
- **Custom range** (optional future enhancement):
  - Start date picker
  - End date picker
- Default: "Last 30 days"

#### Generate Button (bottom)
- Full-width prominent button
- Disabled state when no items selected or no name
- Label: "Generate Graph"
- On tap: Navigate to GraphView with new graph

## Interaction Patterns

### Primary Actions
1. **Enter Graph Name**:
   - Required field
   - Live validation (not empty)

2. **Select Items** (multi-select):
   - Tap item row to toggle selection
   - Checkbox indicates selection state
   - Badge updates with count
   - Filter to find items quickly

3. **Choose Date Range**:
   - Tap preset button to select
   - Default is "Last 30 days"

4. **Generate Graph**:
   - Validates: name not empty, at least 1 item selected
   - Creates new Graph object
   - Navigates to GraphView with graph data
   - Returns to Graphs list after viewing (graph added to list)

### Navigation
- **Back**: Returns to Graphs (discards unsaved configuration)
- **After Generate**: Push to GraphView, then back returns to Graphs (not here)

## Data Model

### Screen State
```typescript
interface GraphCreateState {
  name: string;
  selectedItemIds: Set<string>;
  dateRange: {
    preset: 'last7' | 'last30' | 'last90' | 'all';
    // Future: custom start/end dates
  };
  allItems: Array<{
    id: string;
    name: string;
    category: string;
    categoryId: string;
  }>;
  filterText: string;
}
```

### Output (on Generate)
```typescript
interface NewGraph {
  id: string;                    // Generated UUID
  name: string;
  createdAt: string;
  items: GraphItem[];           // Selected items
  dateRange: { start: string; end: string };
}
```

## Mock Data Requirements
- Uses existing catalog items from `configure-catalog.happy.json`
- No separate mock file needed for this screen
- Items are loaded from catalog mock data

## Theming & Accessibility
- **Theme**: Follow system light/dark mode
- **Colors**: 
  - Background: `theme.background`
  - Cards/sections: `theme.surface` with `theme.border`
  - Selected items: `theme.accentPrimary` checkbox
  - Disabled button: reduced opacity
- **Typography**:
  - Section headers: `typography.body` with fontWeight 600
  - Item names: `typography.body`
  - Category labels: `typography.small`, secondary color
- **Touch Targets**: Minimum 44×44pt for items and buttons
- **Accessibility**: 
  - Items announce name, category, selection state
  - Generate button announces disabled reason if applicable

## i18n Keys
```
graphCreate.title: "Create Graph"
graphCreate.namePlaceholder: "Graph name..."
graphCreate.nameRequired: "Please enter a graph name"
graphCreate.selectItems: "Select Items"
graphCreate.dateRange: "Date Range"
graphCreate.last7Days: "Last 7 days"
graphCreate.last30Days: "Last 30 days"
graphCreate.last90Days: "Last 90 days"
graphCreate.allTime: "All time"
graphCreate.generate: "Generate Graph"
graphCreate.noItemsSelected: "Select at least one item"
graphCreate.filterPlaceholder: "Filter items..."
```

## Design Rationale

### Why Multi-Select List?
- **Story Evidence**: Bob selects "a couple outcomes" and "a few foods"—expects to pick multiple items
- **Reusable Pattern**: Similar to EditEntry item selection (reuse SelectionList component patterns)
- **Scalable**: Filter helps as catalog grows

### Why Preset Date Ranges?
- **MVP Simplicity**: Story shows Bob accepting "default settings" easily
- **Common Use Cases**: 7/30/90 days covers typical analysis needs
- **Future Extensibility**: Can add custom picker later

### Why Name Before Generate?
- **Story Evidence**: "he gives it a short name so he can recognize it later"
- **Required for List**: Name is displayed in Graphs list

## Component Reuse
- **SelectionList pattern**: Multi-select with filter (shared with EditEntry)
- **Theme Hook**: `useTheme()` for current palette
- **i18n Hook**: `useT()` for all UI strings

## Open Questions / Future Enhancements
- **Custom date picker**: Full calendar date range selection
- **Save as template**: Save configuration without generating
- **Graph type selection**: Line, bar, scatter (post-MVP)

---

**Status**: Fresh consolidation
**Last Updated**: 2025-12-03

