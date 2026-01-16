# Vercel AI SDK in Bare React Native (Local)

Plan: use the Vercel AI SDK in bare React Native (no server) with **BYO API keys**.

## Packages

- Core: `ai` (v6.x)
- Provider modules as needed (examples): `@ai-sdk/openai`, `@ai-sdk/anthropic`, `@ai-sdk/google`

## How it works in bare RN

- Use **non-streaming** calls only.
- Call `generateText({ model, messages|prompt })` and `await` the full result.
- This is async (Promise-based): show loading state; the UI should not freeze.

## Provider switching (runtime)

- Store one or more provider API keys in app preferences (secure storage preferred).
- When the user selects a provider, instantiate the corresponding provider client + model at runtime (OpenAI, Anthropic, Gemini, etc.).
- Always call the same `generateText()` API regardless of provider.

## Gotchas

- Don’t use `useChat` / streaming UI: bare RN `fetch` commonly lacks `ReadableStream` support (`response.body.getReader()`), so streaming is unreliable.
- AI Gateway mode isn’t the fit here: it expects a gateway credential and/or centrally-managed provider keys; we call providers directly with user keys.
- Provider capabilities differ (tool calling, JSON modes, message role quirks). Start with plain text chat for maximum portability.
- BYO keys means no bundled secret, but still store keys securely (Keychain/Keystore preferred).


