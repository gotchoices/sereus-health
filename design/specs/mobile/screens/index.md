# Screens Plan (Human Proposal)

Purpose
- Make a first pass at screen names and routes before generation.
- If you leave this as-is, the agent will propose names from stories.

Instructions
- List each screen with a clear, stable name and short purpose.
- Add a proposed route (used for deep links and navigation).
- Optional: note variants to support early (happy, empty, error).

Screens

| Screen Name        | Route             | Purpose                                              | Variants            |
|--------------------|-------------------|------------------------------------------------------|---------------------|
| LogHistory         | LogHistory        | Main log history: list of entries with add/clone    | happy, empty        |
| EditEntry          | EditEntry         | Add/edit/clone a single log entry (modal pickers)   | happy, error        |
| ConfigureCatalog   | ConfigureCatalog  | Manage categories, items, bundles, quantifiers      | happy, empty, error |
| EditItem           | EditItem          | Create/edit item with category and quantifiers      | happy, error        |
| EditBundle         | EditBundle        | Create/edit bundle with member items                | happy, error        |
| Graphs             | Graphs            | Browse saved/named graphs                            | happy, empty        |
| GraphCreate        | GraphCreate       | Select items + date range, generate new graph       | happy              |
| GraphView          | GraphView         | Display and share a specific graph                   | happy              |
| Settings           | Settings          | List of settings sections (Sereus, Reminders, etc.) | happy              |
| SereusConnections  | SereusConnections | View and manage Sereus cadre and guest nodes        | happy, empty, error |
| Reminders          | Reminders         | Configure reminder notification interval             | happy              |

Notes
- Add/remove rows as needed. You can refine names later, but avoiding churn helps.
- Screen-specific requirements go in `design/specs/mobile/screens/<screen-id>.md` (kebab-case).

