# Screens Plan (Human Proposal)

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
| Assistant          | Assistant         | Assistant UI (propose actions with preview/approval) | happy, empty        |
| ApiKeys            | ApiKeys           | Assistant setup: provider + API key(s)               | happy, empty        |
| Settings           | Settings          | List of settings sections (Sereus, Reminders, etc.) | happy              |
| BackupRestore      | BackupRestore     | Export/import full backup from Settings             | happy, error        |
| SereusConnections  | SereusConnections | View and manage Sereus cadre and guest nodes        | happy, empty, error |
| Reminders          | Reminders         | Configure reminder notification interval             | happy              |

Notes
- Screen-specific requirements go in `screens/<screen-id>.md` (kebab-case).
