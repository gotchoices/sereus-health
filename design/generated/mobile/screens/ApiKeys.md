---
provides:
  - screen:mobile:ApiKeys
needs: []
dependsOn:
  - design/stories/mobile/05-assistant.md
  - design/specs/mobile/screens/api-keys.md
  - design/specs/mobile/global/assistant/vercel-ai-sdk.md
  - design/specs/mobile/navigation.md
  - design/specs/mobile/global/general.md
  - design/specs/mobile/global/ui.md
---

# ApiKeys Screen Consolidation

## Purpose

Enable the AI assistant by registering one or more API keys for supported providers. Only one key can be active at a time.

## Route

- **Route**: `ApiKeys` (push from Settings or Assistant)
- **Title**: "Assistant Setup"

## Layout

### Header

- **Left**: Back button (returns to previous screen)
- **Center**: Title "Assistant Setup"
- **Right**: (+) Add button to add a new key

### Key list

Initially empty. Each row contains:

| Element | Description |
|---------|-------------|
| Radio button | Exclusively enables this key (only one active at a time) |
| Provider selector | Dropdown/picker: OpenAI, Anthropic, Google |
| Model selector | Text input or picker (optional, provider-dependent) |
| API key input | Secure text input (masked by default) with visibility toggle (eyeball icon) |
| Trash icon | Delete this key (with confirmation) |

### Empty state

When no keys are configured:

- "No API keys configured"
- "Tap + to add your first API key"

## Behavior

- **Add (+)**: Appends a new row with empty fields; new row is enabled by default
- **Radio selection**: Tapping a radio button enables that key and disables others
- **Delete**: Confirmation dialog before removing a key
- **Persistence**: Keys stored in **device secure storage** (Keychain on iOS, Keystore on Android)
- **Validation**: Provider and API key are required; model is optional

## Providers (per vercel-ai-sdk.md)

- OpenAI (`@ai-sdk/openai`)
- Anthropic (`@ai-sdk/anthropic`)
- Google (`@ai-sdk/google`)

## Navigation

| Action | Target |
|--------|--------|
| Back button | Pop to previous screen |
| Save/changes | Auto-save on change (or explicit save button) |

## Data / state

```typescript
interface ApiKeyEntry {
  id: string;
  provider: 'openai' | 'anthropic' | 'google';
  model?: string;
  apiKey: string;
  enabled: boolean;
}
```

- `keys: ApiKeyEntry[]`
- `loading: boolean`

## i18n keys

```
apiKeys.title: "Assistant Setup"
apiKeys.emptyTitle: "No API keys configured"
apiKeys.emptyMessage: "Tap + to add your first API key"
apiKeys.addKey: "Add API key"
apiKeys.provider: "Provider"
apiKeys.model: "Model (optional)"
apiKeys.apiKey: "API Key"
apiKeys.deleteTitle: "Delete API key?"
apiKeys.deleteMessage: "This cannot be undone."
apiKeys.providerOpenai: "OpenAI"
apiKeys.providerAnthropic: "Anthropic"
apiKeys.providerGoogle: "Google"
```

---

**Status**: Fresh consolidation
**Last Updated**: 2026-01-16

