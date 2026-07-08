# Assistant — Action Plan Format

The assistant proposes work as an **action plan**, submitted as the input to the
`propose_plan` tool (see TOOLS). The app renders it for preview/approval and
executes only the approved actions.

## Structure

```json
{
  "planId": "p1",
  "summary": "Add items for lunch, create a bundle, and add a log entry.",
  "actions": [
    {
      "actionId": "a1",
      "kind": "catalog.createItem",
      "title": "Create item: Arugula",
      "data": { "type": "Activity", "category": "Eating", "name": "Arugula" }
    },
    {
      "actionId": "a2",
      "kind": "catalog.createBundle",
      "title": "Create bundle: Salad",
      "data": { "type": "Activity", "name": "Salad", "members": ["Arugula", "Spinach", "Radishes"] }
    },
    {
      "actionId": "a3",
      "kind": "logs.createEntry",
      "title": "Create log entry (11:30pm): Salad",
      "data": { "timestampUtc": "2026-01-15T23:30:00Z", "type": "Activity", "items": ["Salad"], "comment": null }
    }
  ]
}
```

## Supported action kinds

| kind | `data` fields |
| --- | --- |
| `catalog.createType` | `name` |
| `catalog.createCategory` | `type`, `name` |
| `catalog.createItem` | `type`, `category`, `name`, `description?` |
| `catalog.createQuantifier` | `type`, `category`, `item`, `name`, `minValue?`, `maxValue?`, `units?` |
| `catalog.createBundle` | `type`, `name`, `members` (array of existing item — or bundle — names) |
| `logs.createEntry` | `type`, `items` (array of existing item names), `timestampUtc?`, `comment?` |

Entities may be identified by **name or id** — either is accepted:
`type`/`typeName` or `typeId`; `category`/`categoryName` or `categoryId`;
`item`/`itemName` or `itemId`. `members`/`items` may be plain names or objects
like `{ itemId, itemName }`. If you looked up ids with `db_query`, pass them; the
app falls back to names if an id doesn't resolve. Missing parent type/category are
created automatically. Prefer existing catalog entries — query first (see
GUARDRAILS / TOOLS).

## Rules

- `actionId` must be **stable** across refinement turns.
- The UI communicates selection state by `actionId`; only selected actions run.
- If the user submits a new prompt while a plan is pending, the plan is superseded;
  you are told the last selection state and may propose a **revised** plan
  (keep unchanged actions' ids stable). This is how the user edits a plan — in
  conversation, not with per-field controls.
