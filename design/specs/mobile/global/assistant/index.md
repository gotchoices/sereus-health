# Assistant (Mobile) — Index

Two kinds of resources:

- **Prompt Pack** — docs bundled into the app and sent to the assistant each turn.
- **Local** — build/architecture notes for developers (never sent to the model).

## Prompt Pack (bundled + sent each turn)

Assembled by `systemPrompt.ts` in this order (see `pack.md`):

- `overview.md` — what the app is for; the assistant's role; "how do I…?" style.
- `protocol.md` — propose → approve; stable action ids; selection state; revision.
- `action-plan.md` — action plan format + supported action kinds.
- `guardrails.md` — insert-only, no destructive edits, query-first, idempotent.
- `tools.md` — the real tools (`db_query`, `propose_plan`, `view_attachment`),
  usage rules, and planned tools.
- `attachments.md` — how to handle attached images/PDFs.
- Domain truth (named resources): `SCHEMA_QSQL` (`design/specs/domain/schema.qsql`),
  `TAXONOMY_DOC`, `BUNDLES_DOC`, `LOGGING_DOC`, `IMPORT_EXPORT_DOC`.
- Per-turn **session context** (screen, locale, timezone, current UTC time).

## Local (developer notes)

- `pack.md` — how the pack is built (codegen) and how the prompt is assembled.
- `vercel-ai-sdk.md` — model selection + chat via `@serfab/ai-models`
  (non-streaming, tools, multimodal, BYO keys).
- UI shell: `design/specs/mobile/components/assistant.md`.

## Implementation map (code)

- Model/chat: `packages/ai-models` (`resolveModel`, `chat`).
- Prompt pack: `apps/mobile/scripts/build-assistant-pack.js` → `pack.generated.ts`
  → `pack.ts`; assembled by `assistant/systemPrompt.ts`.
- Tools: `assistant/tools.ts`. Plan parse/exec: `assistant/actionPlan.ts`,
  `assistant/executor.ts`.
- Conversation state: `assistant/conversationStore.ts`.
- Attachments: `assistant/attachment.ts` (pick/capture),
  `assistant/attachmentStore.ts` (disk blobs), `assistant/attachmentContext.ts`
  (markers / inline / sanitize).

## Divergences from the original spec (now reflected above)

- No model-callable `db.exec`: writes flow only through an approved plan executed
  by the app (insert-only, idempotent).
- `db.query` → `db_query` (read-only, encouraged for reuse checks).
- Added: `propose_plan` (proposals) and `view_attachment` (re-view attachments).
- Added: image/PDF attachments (camera + file), reference-based history, and
  conversation persistence.
- `import.canonical`, `export.*`, `reminders.set` are specified but **not yet
  implemented** (kept as planned).
