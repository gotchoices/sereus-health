---
provides:
  - screen:mobile:Assistant
needs:
  - component:mobile:Assistant
  - screen:mobile:ApiKeys
dependsOn:
  - design/stories/mobile/05-assistant.md
  - design/specs/mobile/screens/assistant.md
  - design/specs/mobile/components/assistant.md
  - design/specs/mobile/screens/api-keys.md
  - design/specs/mobile/navigation.md
  - design/specs/mobile/global/general.md
  - design/specs/mobile/global/ui.md
  - design/specs/mobile/global/assistant/overview.md
  - design/specs/mobile/global/assistant/protocol.md
  - design/specs/mobile/global/assistant/tools.md
  - design/specs/mobile/global/assistant/guardrails.md
---

# Assistant Screen Consolidation

## Purpose

Dedicated screen hosting the AI assistant component. This is the root of the Assistant tab.

## Route

- **Route**: `Assistant` (Assistant tab root)
- **Title**: "Assistant"

## Layout

### Not configured state

If no API key is enabled:

- Show message: "Assistant not configured"
- CTA button: "Set up Assistant" → navigates to `ApiKeys`

### Configured state

Hosts the reusable Assistant component (`components/assistant.md`):

**Toolbar**
- Back button (left) — since this is a tab root, may be hidden or disabled
- Title: "Assistant"
- Clear conversation button (right)

**Conversation area**
- Scrollable transcript of user prompts and assistant responses
- Proposed actions panel (collapsed until agent populates it)

**Proposed actions (when visible)**
- List of proposed actions with checkboxes (selected by default)
- "Perform selected actions" primary CTA
- "Cancel" secondary CTA

**Prompt bar (bottom, above tab bar)**
- Attachment button (file/image/camera)
- Text input
- Send button

### Bottom tab bar

Per `navigation.md`, 4 tabs (left → right): Home, Assistant, Catalog, Settings

| Tab       | Icon (Ionicons)                       | Active state      |
| --------- | ------------------------------------- | ----------------- |
| Home      | `home` / `home-outline`               | filled when active|
| Assistant | `sparkles` / `sparkles-outline`       | filled when active|
| Catalog   | `list` / `list-outline`               | filled when active|
| Settings  | `settings` / `settings-outline`       | filled when active|

## Navigation

| Action | Target |
|--------|--------|
| "Set up Assistant" (not configured) | `ApiKeys` |
| Tab bar | switch tabs |

## Data / state

- `isConfigured: boolean` — whether an enabled API key exists
- `messages: Message[]` — conversation history (session-only)
- `proposedActions: Action[]` — pending action plan from agent
- `inputText: string` — current prompt text
- `isLoading: boolean` — waiting for agent response

## i18n keys

```
assistant.title: "Assistant"
assistant.notConfiguredTitle: "Assistant not configured"
assistant.notConfiguredMessage: "Set up an API key to use the assistant."
assistant.setupButton: "Set up Assistant"
assistant.inputPlaceholder: "Ask anything..."
assistant.send: "Send"
assistant.clearConversation: "Clear"
assistant.performActions: "Perform selected actions"
assistant.cancelActions: "Cancel"
```

---

**Status**: Fresh consolidation
**Last Updated**: 2026-01-16

