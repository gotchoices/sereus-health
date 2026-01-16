# Assistant — Tools

This file defines the tool inventory and the minimal “API contract” for each tool.

## Domain truth (provided in context)

You will be provided these documents in the agent context (as text):

- `SCHEMA_QSQL`
- `TAXONOMY_DOC`
- `BUNDLES_DOC`
- `LOGGING_DOC`
- `IMPORT_EXPORT_DOC`

## Tool: `db.exec`

Execute SQL against the local DB.

- **Input**
  - `sql`: string
  - `params`: array (positional bind params)
- **Output**
  - `rowsAffected`: number

Rules:

- Do not call unless it is required to fulfill the user request and/or produce a correct preview.
- Insert-only for now: no `DELETE` / `UPDATE` statements.

## Tool: `db.query`

Query the local DB (read-only).

- **Input**
  - `sql`: string
  - `params`: array
- **Output**
  - `rows`: array of objects

Rules:

- No unsolicited queries.

## Tool: `import.canonical`

Import canonical app data (YAML/JSON) from an attached file or pasted content.

- **Input**
  - `source`: `{ kind: 'attachment' | 'paste', id?: string, text?: string }`
  - `mode`: `'catalog' | 'logs' | 'backup'`
- **Output**
  - `plan`: proposed actions with stable IDs (for preview/approval)

## Tool: `export.logs.csv`

Export log entries as CSV per `IMPORT_EXPORT_DOC`.

- **Input**
  - `scope`: `'all' | 'filtered'`
- **Output**
  - `file`: `{ filename: string, mime: 'text/csv' }`

## Tool: `export.catalog`

Export catalog as canonical YAML/JSON per `IMPORT_EXPORT_DOC`.

- **Input**
  - `format`: `'yaml' | 'json'`
- **Output**
  - `file`: `{ filename: string, mime: string }`

## Tool: `export.backup`

Export full backup as canonical YAML/JSON per `IMPORT_EXPORT_DOC`.

- **Input**
  - `format`: `'yaml' | 'json'`
- **Output**
  - `file`: `{ filename: string, mime: string }`

## Tool: `reminders.set`

Create/update reminders.

- **Input**
  - `reminders`: array (new desired reminder configuration)
- **Output**
  - `plan`: proposed actions with stable IDs (for preview/approval)


