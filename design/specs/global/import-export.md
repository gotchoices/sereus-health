# Import/Export Specification

## Overview

Import/export functionality appears in two contexts:
1. **Contextual** (LogHistory, ConfigureCatalog) - via hamburger menu in filter bar
2. **Settings** - Backup & Restore section

## UI Placement

### Contextual Screens (LogHistory, ConfigureCatalog)

When user taps the search icon:
- Filter bar appears with text input
- Hamburger menu icon appears on the right side of the filter bar
- Hamburger menu contains: "Export", "Import..."

### Settings Screen

Backup & Restore section contains:
- "Export Backup" - exports everything to YAML
- "Import" - imports from any supported file

## Export Behavior

| Context | Format | Scope |
|---------|--------|-------|
| LogHistory | CSV | Log entries matching current filter (or all if empty) |
| ConfigureCatalog | CSV | Full catalog (types, categories, items, quantifiers, bundles) |
| Settings | YAML | Everything (catalog + logs + settings) |

### CSV Structure - Log Entries

```csv
timestamp,type,category,item,quantifier,value,unit,comment
2024-12-05T08:00:00Z,Activity,Eating,Omelette,,,,Breakfast
2024-12-05T09:00:00Z,Activity,Exercise,Pushups,Count,20,reps,Morning workout
```

One row per item-quantifier pair. Entries with multiple items/quantifiers span multiple rows.

### CSV Structure - Catalog

```csv
type,category,item,quantifier_name,quantifier_unit,quantifier_min,quantifier_max
Activity,Eating,Omelette,,,, 
Activity,Eating,Omelette,Eggs,count,1,6
Activity,Exercise,Pushups,Count,reps,0,100
```

One row per item-quantifier pair. Items without quantifiers have empty quantifier columns.

### YAML Structure - Catalog

```yaml
types:
  - id: type-activity
    name: Activity
    color: "#3B82F6"
    categories:
      - name: Eating
        items:
          - name: Omelette
            quantifiers:
              - name: Eggs
                unit: count
                min: 1
                max: 6
          - name: Toast
      - name: Exercise
        items:
          - name: Pushups
            quantifiers:
              - name: Count
                unit: reps
                min: 0
                max: 100
bundles:
  - name: Morning Routine
    type: Activity
    items:
      - Omelette
      - Toast
      - Orange Juice
```

### YAML Structure - Full Backup

```yaml
version: 1
exported_at: 2024-12-05T14:30:00Z
catalog:
  types: [...]
  bundles: [...]
logs:
  - timestamp: 2024-12-05T08:00:00Z
    type: Activity
    category: Eating
    items:
      - name: Omelette
        quantifiers:
          - name: Eggs
            value: 3
    comment: Breakfast
settings:
  # Future: user preferences, reminder settings, etc.
```

## Import Behavior

### Format Detection

Import auto-detects format by:
1. File extension (.csv, .yaml, .yml, .json)
2. Content inspection (CSV has commas, YAML/JSON has structure)

### Content Detection (Settings Import)

Settings import examines file structure to determine scope:
- Has `logs` key → includes log entries
- Has `catalog` or `types` key → includes catalog
- Has `settings` key → includes settings

Imports only what's present in the file.

### Idempotency

Imports are idempotent—re-importing the same data does not create duplicates.

**Log entry identity** (match = same entry):
- timestamp (exact match)
- type
- Set of items (order-independent)

If all match, entry is skipped (or updated if values differ).

**Catalog item identity** (match = same item):
- name (case-insensitive)
- category name
- type name

If match found:
- Skip if identical
- Update if properties differ (quantifiers, etc.)

**Bundle identity**:
- name (case-insensitive)
- type

### Import Preview

Before committing, show preview:
- Count of new entries/items to add
- Count of existing entries/items to update
- Count of entries/items to skip (identical)
- Sample of first few items

User confirms or cancels.

### Error Handling

| Error | Behavior |
|-------|----------|
| Invalid format | Show error, abort |
| Missing required columns (CSV) | Show error, abort |
| Unknown type/category in log import | Create if possible, or show warning |
| Partial success | Show summary of what succeeded/failed |

## File Sharing

After export, offer system share sheet for:
- Email attachment
- Save to Files
- Cloud storage (iCloud, Google Drive, etc.)
- AirDrop (iOS)

