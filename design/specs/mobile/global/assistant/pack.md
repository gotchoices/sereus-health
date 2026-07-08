# Building the Assistant Prompt Pack (local build note)

For app developers. How the prompt pack is bundled and assembled.

## Key constraint

The in-app assistant cannot read the repo filesystem, so every doc it needs is
compiled into the app.

## How it's built

`scripts/build-assistant-pack.js` reads the docs below and emits
`src/assistant/pack.generated.ts` (runs on `prestart`, or `yarn pack:build`).
`src/assistant/pack.ts` re-exports `PACK_DOCS` + `DOMAIN_DOCS` from it.

> We use codegen, NOT a metro `.md` importer: adding `.md` to `sourceExts` makes
> Metro index every markdown file in the monorepo (~18k) and pegs the packager.

Bundled docs:

- Prompt-pack (`PACK_DOCS`): `overview.md`, `protocol.md`, `tools.md`,
  `guardrails.md`, `action-plan.md`, `attachments.md`.
- Domain truth (`DOMAIN_DOCS`, named resources): `SCHEMA_QSQL` (schema.qsql),
  `TAXONOMY_DOC`, `BUNDLES_DOC`, `LOGGING_DOC`, `IMPORT_EXPORT_DOC`.

## How the system prompt is assembled

`src/assistant/systemPrompt.ts` composes each turn's system prompt from the
bundled docs, in order: `overview` → domain docs → `protocol` → `action-plan` →
`guardrails` → `tools` → `attachments` → per-turn **session context** (current
screen, locale, timezone, current UTC time). The docs are the single source of
truth — the composer only orders them and appends session context.

## Per-turn conversation context (handled outside the system prompt)

- The running conversation (user/assistant turns + tool calls/results) is threaded
  as messages, so the model sees the whole thread. See `conversationStore.ts`.
- Attachments are **not** inlined in history: a fresh attachment is sent inline for
  its turn only; older ones appear as reference markers and are re-fetched on
  demand via the `view_attachment` tool. See `attachmentStore.ts` /
  `attachmentContext.ts`.
- A pending action plan + its selection state are fed back to the model as the
  `propose_plan` tool result when the user sends a new prompt or approves/dismisses.
