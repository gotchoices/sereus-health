# Assistant (Mobile) — Index

This folder intentionally contains **two kinds of resources**:

- **Local**: guidance for humans/agents maintaining the codebase and specs.
- **Prompt Pack**: human-readable instructions intended to be bundled into the app and transmitted to the in-app assistant each turn.

## Local: build notes (not for inclusion in agent turns)

- Prompt pack construction: `pack.md`
- UI shell spec (layout/controls): `design/specs/mobile/components/assistant.md`
- Domain truth (schema and portability):
  - `design/specs/domain/schema.qsql`
  - `design/specs/domain/taxonomy.md`
  - `design/specs/domain/bundles.md`
  - `design/specs/domain/logging.md`
  - `design/specs/domain/import-export.md`

## Prompt Pack: include in agent turns

- `overview.md` — what the app is for; what the assistant should do; how to answer “how do I…?”
- `protocol.md` — action plan + approval semantics (stable action IDs; selection state)
- `tools.md` — tool inventory + APIs (including SQL tool)
- `guardrails.md` — strict “don’ts” (insert-only; no unsolicited SQL; no deletes/updates)
- `action-plan.md` — action plan JSON structure (stable action IDs)

