# Assistant — Action Plan JSON

The assistant proposes work as an **action plan**. The app renders the plan for preview/approval and executes only approved actions.

## Plan structure

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

## Rules

- `actionId` must be **stable** across refinement turns.
- The UI communicates selection state by `actionId`.
- If the user submits a new prompt while a plan is pending, the plan is canceled; the assistant receives the last selection state and may propose a revised plan.


