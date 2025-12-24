# GraphView Screen Consolidation

---
provides:
  - screen:mobile:GraphView
dependsOn:
  - design/stories/mobile/06-graphing.md
  - design/specs/mobile/navigation.md
  - design/specs/mobile/screens/index.md
  - design/specs/mobile/global/general.md
  - design/specs/mobile/global/ui.md
---

## Purpose
Display a generated graph showing selected items over time. Provides ability to share the graph as an image.

## Screen Identity
- **Route**: `GraphView` (push from Graphs or GraphCreate)
- **Title**: "{Graph Name}" (dynamic)
- **Deep Link**: `health://screen/GraphView?graphId={id}`

## User Journey Context
From stories:
- **06-graphing.md**: 
  - "the app generates a graph which includes all dates (horizontal) and all quantifiers (vertical) each scaled according to their own ranges"
  - "Each item is color coded and the graph includes a legend"
  - "he shares each one in turn"
  - "The share option allows him to attach the figures to text messages and/or email"
  - "the graphs are crisp and clear, suitable for printing with excellent clarity"

## Layout & Information Architecture

### Header
- **Back Button** (left): Returns to previous screen (Graphs or GraphCreate)
- **Title**: Graph name (dynamic, centered)
- **Share Button** (right): Share graph as image

### Main Content Area

#### Graph Display
- **Chart Area** (majority of screen):
  - X-axis: Date range (horizontal)
  - Y-axis: Values (vertical, multi-scale if needed)
  - Data lines/points for each selected item
  - Color-coded by item

#### Legend
- **Below or beside graph**:
  - Item name + color indicator for each tracked item
  - Shows what each line/series represents

#### Graph Metadata
- **Date range**: "Nov 1 - Nov 30, 2025"
- **Items count**: "3 items"

### For MVP (Placeholder Implementation)
Since we haven't selected a charting library yet:
- Display a placeholder graphic or message
- Show graph metadata (name, items, date range)
- Share button can share metadata as text for now

## Interaction Patterns

### Primary Actions
1. **Share Graph**:
   - Opens native share sheet
   - MVP: Shares text summary of graph
   - Future: Shares graph as PNG/JPEG image
   - Story: "suitable for printing with excellent clarity"

2. **Navigate Back**:
   - Returns to Graphs list (if came from there)
   - Returns to Graphs list (if came from GraphCreate - graph now in list)

### Navigation
- **Back**: Previous screen in stack
- **Deep Links**: `health://screen/GraphView?graphId={id}`

## Data Model

### Input (from navigation params)
```typescript
interface GraphViewParams {
  graphId: string;
  // Or full graph object passed directly
  graph?: Graph;
}
```

### Graph Object
```typescript
interface Graph {
  id: string;
  name: string;
  createdAt: string;
  items: Array<{ id: string; name: string; category: string }>;
  dateRange: { start: string; end: string };
}
```

## Theming & Accessibility
- **Theme**: Follow system light/dark mode
- **Colors**: 
  - Background: `theme.background`
  - Chart area: `theme.surface`
  - Grid lines: `theme.border`
  - Data colors: Distinct colors for each series (accessible palette)
- **Typography**:
  - Title: `typography.title`
  - Legend items: `typography.small`
  - Axis labels: `typography.small`
- **Accessibility**: 
  - Chart has accessible description
  - Legend items readable by screen reader

## i18n Keys
```
graphView.title: "Graph"  // fallback if name not available
graphView.share: "Share"
graphView.shareSuccess: "Graph shared successfully"
graphView.shareError: "Failed to share graph"
graphView.noData: "No data available for selected range"
graphView.legend: "Legend"
graphView.dateRange: "{start} - {end}"
```

## Design Rationale

### Why Placeholder for MVP?
- **Library Selection Needed**: STATUS.md notes we need to select a React Native charting library
- **Functionality First**: Get navigation and data flow working before visualization
- **Story Completion**: Share and view flows work even without actual chart

### Why Native Share?
- **Story Evidence**: "attach the figures to text messages and/or email"
- **Platform Standard**: Uses OS share sheet for maximum compatibility
- **No Account Required**: Works without sign-in to any service

## Component Reuse
- **Theme Hook**: `useTheme()` for current palette
- **i18n Hook**: `useT()` for all UI strings
- **Share API**: React Native's Share module

## Open Questions / Future Enhancements
- **Chart Library**: Select from react-native-charts-wrapper, victory-native, react-native-chart-kit
- **Zoom/Pan**: Interactive chart exploration
- **Export Formats**: PDF, CSV export options
- **Print Support**: Direct print action

---

**Status**: Fresh consolidation (MVP placeholder)
**Last Updated**: 2025-12-03

