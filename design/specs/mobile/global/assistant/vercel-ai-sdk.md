# Model & Chat Integration (local build note)

For app developers. How the app talks to LLM providers, in bare React Native with
**bring-your-own API keys** (no server).

## Through `@serfab/ai-models`

The app does not instantiate provider clients directly. Everything goes through the
`@serfab/ai-models` package (`health/packages/ai-models`):

- **Model selection** — `resolveModel({ provider, apiKey }, { require, cache })`
  queries the provider's `/models` endpoint (what the key can actually call) and
  intersects it with models.dev capability metadata. It auto-picks a valid model
  and can require capabilities (`tools`, `vision`, `pdf`). No hardcoded model ids.
- **Chat** — `@serfab/ai-models/chat` wraps the Vercel AI SDK (`generateText`).
  This is the ONLY place `@ai-sdk/*` is imported; a provider/SDK swap touches only
  that seam.

## What we use

- **Non-streaming** `chat()` (await the full result). Bare-RN `fetch` lacks
  reliable `ReadableStream`, so streaming UI is avoided.
- **Tool calling** (`tools` + multi-step loop): `db_query`, `propose_plan`,
  `view_attachment` (see TOOLS). Requires a tools-capable model (gated via
  `resolveModel({ require: ['tools'] })`).
- **Multimodal input**: images/PDFs are passed as content-part **bytes**
  (`Uint8Array`), not base64 strings — a bare base64/`data:` string makes the SDK
  try to `fetch` it (RN can't), failing with `AI_DownloadError`. Attachment vision
  needs a `vision`/`pdf`-capable model.
- **Media tool results**: `view_attachment` returns image bytes via a tool
  `toModelOutput` content result. Supported by Anthropic; gated per provider.

## Gotchas

- Don't use `useChat`/streaming.
- Provider capabilities differ — always gate via `resolveModel`.
- BYO keys: no bundled secret; store keys securely (Keychain/Keystore — TODO,
  currently AsyncStorage).
