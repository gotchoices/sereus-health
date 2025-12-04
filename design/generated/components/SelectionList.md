# SelectionList Component Consolidation

## Purpose
A reusable, filterable list component used throughout Sereus Health wherever Bob needs to browse and select from collections: choosing items when logging, building groups in catalog, selecting items for graphs, etc.

## Component Identity
- **Type**: Reusable presentational component
- **File**: `src/components/SelectionList.tsx`
- **Used By**: EditEntry, ConfigureCatalog, Graphs, and any screen needing item selection

## User Journey Context
From stories:
- **01-exploring.md**: Bob sees lists of categories (Activity/Condition/Outcome), then items (Eating, Exercising), then specific foods
- **03-configuring.md**: Bob uses filter to narrow long food list ("bac" → bacon), selects multiple items for BLT group
- **06-graphing.md**: Bob selects items to include in graphs

## Props API

```typescript
interface SelectionListProps<T> {
  // Data
  items: T[];
  keyExtractor: (item: T) => string;
  labelExtractor: (item: T) => string;
  
  // Selection
  selectionMode: 'none' | 'single' | 'multi';
  selectedIds?: string[];
  onSelectionChange?: (selectedIds: string[]) => void;
  
  // Filtering
  filterEnabled?: boolean;  // default: true
  filterPlaceholder?: string;  // i18n key
  filterPredicate?: (item: T, query: string) => boolean;  // default: case-insensitive label match
  
  // Display
  renderItem?: (item: T, isSelected: boolean) => React.ReactNode;  // custom row renderer
  emptyMessage?: string;  // i18n key
  emptyFiltered Message?: string;  // i18n key for "no results match filter"
  
  // Actions
  onItemPress?: (item: T) => void;  // for non-selection taps (e.g., drill-down)
  
  // Styling
  style?: ViewStyle;
}
```

## Layout & Structure

### Filter Bar (if filterEnabled)
- **Text Input**:
  - Full width minus padding
  - Placeholder: `filterPlaceholder` (localized)
  - Clear button ("×") when text present
  - Icon: search/filter icon (ionicons `search`)
- **Styling**:
  - Background: `surfaceLight`/`surfaceDark`
  - Border bottom: `borderLight`/`borderDark`
  - Padding: 12pt vertical, 16pt horizontal

### Item List
- **FlatList** (virtualized):
  - Scrollable, efficient for large lists
  - Each row:
    - **Checkbox/Radio** (if selectionMode !== 'none'):
      - Leading (left) position
      - Size: 24×24pt
      - ionicons: `checkbox-outline` (unchecked), `checkbox` (checked) for multi
      - ionicons: `radio-button-off` (unchecked), `radio-button-on` (checked) for single
    - **Label**:
      - Body text (16pt)
      - Primary text color
      - Truncates with ellipsis if too long
    - **Custom Content** (if renderItem provided):
      - Renders custom ReactNode instead of default label
  - Row height: 48-56pt (comfortable touch target)
  - Row press:
    - If selectionMode active: toggle selection
    - If onItemPress provided: call onItemPress
  - Row styling:
    - Background: transparent (or subtle highlight on press)
    - Border bottom: thin `borderLight`/`borderDark` separator
    - Padding: 12pt vertical, 16pt horizontal

### Empty State
- **No Items**:
  - Centered message: `emptyMessage` (localized)
  - Icon: ionicons `document-text-outline`
  - Subdued text color
- **No Filtered Results**:
  - Centered message: `emptyFilteredMessage` (localized)
  - Icon: ionicons `search-outline`
  - "Clear filter" button/link

## Interaction Patterns

### Filtering
1. User types in filter input
2. Component filters items locally (client-side) using `filterPredicate`
3. List updates instantly (no debounce needed for small datasets; add if needed for 1000s of items)
4. If no matches, show `emptyFilteredMessage` state

### Selection (Multi-Select)
1. User taps row or checkbox
2. `onSelectionChange` called with updated `selectedIds[]`
3. Parent component manages selection state (controlled component pattern)
4. Checkboxes reflect current `selectedIds` prop

### Selection (Single-Select)
1. User taps row or radio button
2. `onSelectionChange` called with single-item array `[id]`
3. Previous selection automatically deselected
4. Radio buttons reflect current `selectedIds[0]`

### No Selection (Browse-Only)
1. If `selectionMode === 'none'` and `onItemPress` provided:
   - User taps row → `onItemPress(item)` called
   - Use case: drill-down navigation (e.g., category → items)

## Theming & Accessibility
- **Theme**: Uses `useTheme()` hook for colors
- **Typography**: `body` for labels, `small` for metadata
- **Spacing**: Follows spacing scale
- **Touch Targets**: Entire row is tappable (minimum 44pt height)
- **Accessibility**:
  - Filter input has label and hint
  - Checkboxes/radios have accessible states
  - Rows announce label and selection state
  - Empty states have meaningful messages

## i18n Keys
```
selectionList.filterPlaceholder: "Filter..."
selectionList.clearFilter: "Clear filter"
selectionList.empty: "No items"
selectionList.emptyFiltered: "No items match your filter"
```
(Note: Consuming screens can override with specific messages)

## Default Behavior
- **filterPredicate**: Case-insensitive substring match on label
- **filterEnabled**: true
- **selectionMode**: 'none'
- **emptyMessage**: "No items"
- **emptyFilteredMessage**: "No items match your filter"

## Component Variants / Use Cases

### Use Case 1: Selecting Items for Log Entry (EditEntry)
- **selectionMode**: 'multi'
- **items**: Available items from selected category
- **selectedIds**: Currently selected items in draft entry
- **onSelectionChange**: Update draft entry state
- **filterEnabled**: true (for long lists like foods)

### Use Case 2: Selecting Category (EditEntry)
- **selectionMode**: 'single'
- **items**: Top-level types or categories
- **onSelectionChange**: Navigate to next step (item selection)

### Use Case 3: Building a Group (ConfigureCatalog)
- **selectionMode**: 'multi'
- **items**: All items available for group membership
- **selectedIds**: Items currently in group
- **onSelectionChange**: Update group composition
- **filterEnabled**: true (story 03: "bac" → bacon)

### Use Case 4: Browsing Catalog Hierarchy (ConfigureCatalog)
- **selectionMode**: 'none'
- **onItemPress**: Drill down into category or edit item
- **filterEnabled**: true

### Use Case 5: Selecting Items for Graph (Graphs)
- **selectionMode**: 'multi'
- **items**: All loggable items with quantifiers
- **selectedIds**: Items to include in graph
- **onSelectionChange**: Update graph configuration

## Implementation Notes
- Built on core RN primitives: `FlatList`, `TextInput`, `TouchableOpacity`, `View`, `Text`
- No external list libraries (keeps dependencies minimal)
- Virtualization via `FlatList` ensures performance with 100s-1000s of items
- Filtering happens in-memory; for very large datasets (10k+ items), consider debouncing or server-side filtering (not needed for MVP)

## Testing Considerations
- **Mock Variants**:
  - Empty list
  - Single item
  - 100+ items (test virtualization and filtering)
  - Pre-selected items (test controlled selection)
- **Interaction**:
  - Filter narrows list correctly
  - Clear filter resets list
  - Selection state persists through filtering
  - Multi-select allows multiple
  - Single-select allows only one

---

**Status**: Fresh consolidation
**Last Updated**: 2025-11-29

