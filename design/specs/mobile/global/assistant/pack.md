# Building the Assistant Prompt Pack

This file is **for app developers**. It describes how to build the prompt pack that is transmitted to the in-app assistant each turn.

## Key constraint

The in-app assistant **cannot read the repo filesystem**. Any “reference docs” it needs must be **bundled** into the app and sent as part of the agent context.

## What to include in the prompt pack

### Type 2 prompt pack docs (this folder)

Include the full text of:

- `overview.md`
- `protocol.md`
- `tools.md`
- `guardrails.md`
- `action-plan.md`

### Domain truth excerpts (inject as named resources)

Include (or excerpt) and inject as named resources:

- `SCHEMA_QSQL`: from `design/specs/domain/schema.qsql`
- `TAXONOMY_DOC`: from `design/specs/domain/taxonomy.md`
- `BUNDLES_DOC`: from `design/specs/domain/bundles.md`
- `LOGGING_DOC`: from `design/specs/domain/logging.md`
- `IMPORT_EXPORT_DOC`: from `design/specs/domain/import-export.md`

If token budget is limited, prefer: `IMPORT_EXPORT_DOC` + `TAXONOMY_DOC` + a schema excerpt that contains table/entity names and key identity constraints.

## Per-turn app context (dynamic)

At each agent turn, also transmit:

- current screen/route (e.g., `Assistant`, `LogHistory`, `ConfigureCatalog`)
- locale + timezone
- current timestamp (UTC)
- any attachments metadata (type, filename, byte size) and access handles
- if an action plan is pending:
  - the current action plan JSON
  - the user selection state by `actionId`


