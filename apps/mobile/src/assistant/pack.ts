/**
 * Assistant prompt pack — design docs compiled into the app.
 *
 * The in-app assistant cannot read the repo filesystem, so the docs are baked in
 * at build time by scripts/build-assistant-pack.js (run via `prestart`/`yarn
 * pack:build`) into pack.generated.ts. See design/specs/mobile/global/assistant/
 * pack.md for what belongs here.
 *
 * `PACK_DOCS`  — assistant operating manual (overview/protocol/tools/guardrails/action-plan).
 * `DOMAIN_DOCS` — domain truth injected as named resources (schema/taxonomy/…).
 */
export { PACK_DOCS, DOMAIN_DOCS } from './pack.generated';
