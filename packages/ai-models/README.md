# @serfab/ai-models

Cross-provider LLM **model discovery, capability metadata, and selection** for
OpenAI, Anthropic, and Google (Gemini API). Framework-free core, with an
optional thin **Vercel AI SDK** chat seam.

> **Name is a placeholder.** `@serfab/ai-models` is the incubation name — rename the
> scope before promoting out of `health/`. The barrel exports mean import sites
> only reference the package name, so a rename is mechanical.

## Why this exists

- **Live entitlement** — "what can *this key* call?" — comes only from each
  provider's own `/v1/models` endpoint (account/tier-specific).
- **Capability metadata** — "does it do vision / PDF / tools?" — comes from the
  community-maintained [models.dev](https://models.dev) catalog.

Neither half alone is enough; this package intersects them.

```
suitable models = live /v1/models  ⨝  models.dev capabilities
```

## Layout

```
src/
  types.ts          # framework-free types (no ai / @ai-sdk imports)
  providers/*.ts    # live /v1/models adapters (openai, anthropic, google)
  catalog.ts        # models.dev fetch + cache (TTL) + trim + offline snapshot
  capabilities.ts   # derive capability flags; id matching; chat-model filter
  resolve.ts        # listAvailableModels + resolveModel (default pick / validate)
  snapshot/         # vendored trimmed models.dev snapshot (offline fallback)
  chat/             # ← the ONLY place @ai-sdk/* is imported
```

Two entry points:

- `@serfab/ai-models` — core (no `ai`/`@ai-sdk` pulled in).
- `@serfab/ai-models/chat` — the Vercel AI SDK seam.

## Usage

### Pick / validate a model

```ts
import { resolveModel } from '@serfab/ai-models';

// auto-pick a sensible default (cheapest chat model), verified against the key
const { id, model, warning, entitlementVerified } = await resolveModel(
  { provider: 'openai', apiKey },
  { cache: asyncStorageCache },          // optional; see CacheStore
);

// require capabilities (e.g. attaching an image)
await resolveModel({ provider, apiKey }, { require: ['vision'], prefer: 'capable' });

// honor a user override, validated as a *warning* (never a hard block)
await resolveModel({ provider, apiKey }, { model: userModelId });
```

### List models for a picker UI

```ts
import { listAvailableModels } from '@serfab/ai-models';

const { models } = await listAvailableModels({ provider, apiKey }, { cache });
// models[].capabilities.{vision,pdf,tools,...} → drive the attach affordance
```

### Chat (Vercel seam)

```ts
import { chat, streamChat } from '@serfab/ai-models/chat';

const res = await chat({ provider, apiKey, modelId: id, messages, tools });
```

## Design notes

- **`entitlementVerified`** — `true` when the live listing succeeded (the list
  reflects real entitlements). `false` means live listing failed and results are
  catalog-only (capabilities known, callability *not* verified).
- **Overrides are advisory.** A user-specified model that isn't in the live list
  is still honored, with a warning — provider `/models` lists occasionally omit
  callable aliases.
- **The chat seam is the swap point.** Nothing outside `src/chat/` imports
  `@ai-sdk/*`. A framework swap or AI SDK major-version migration is a rewrite of
  `chat/factory.ts` + `chat/chat.ts` only.
- **Offline** — `catalog.ts` falls back stale-cache → vendored snapshot. Refresh
  the snapshot with `scripts` (see below) periodically.

## Peer dependencies

`ai`, `@ai-sdk/openai`, `@ai-sdk/anthropic`, `@ai-sdk/google` are **optional peer
deps** — required only if you import `@serfab/ai-models/chat`. The core needs none.

## Refreshing the offline snapshot

`src/snapshot/models-snapshot.json` is a trimmed copy of `models.dev/api.json`
(openai/anthropic/google only). Regenerate when it drifts:

```sh
curl -s https://models.dev/api.json \
  | node -e 'const d=JSON.parse(require("fs").readFileSync(0));const o={};for(const p of ["openai","anthropic","google"])o[p]={models:d[p].models};process.stdout.write(JSON.stringify(o))' \
  > src/snapshot/models-snapshot.json
```
