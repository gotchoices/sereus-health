# Assistant

Reusable assistant UI component that can be hosted in a dedicated screen (initial implementation) and later in an overlay/modal.

## Layout

- **Toolbar**
  - Back Navigation:  If in a screen
  - Title: “Assistant”
  - Clear conversation: control
  - Close/dismiss: if in an overlay/modal

- **Conversation**
  - Scrollable transcript showing user prompts and assistant responses.
  - The assistant may render a structured “Proposed actions” section as part of its response.

- **Proposed actions (preview-before-commit)**
  Pane is normally collapsed but becomes visible when the agent response actively populates it via a tool call.  Contains:
  - A scrollable list of actions the assistant proposes (e.g., create items, create bundles, create log entries, import canonical data).
  - Each proposed action has a stable ID and is selectable (checked by default).
  - Primary CTA button: Perform selected actions
  - Secondary CTA button: Cancel
  - Agent is advised at next turn if user canceled or selectively approved actions (selection state is conveyed by action IDs).

- **Prompt bar**
  - Attachments control (add file/image/camera)
  - Text input (may use OS voice-to-text)
  - Send control

## Behavior

- The assistant maintains conversational context within the current session.
- The user can iteratively refine the proposed actions before confirming.
- If the user enters a new prompt while an approval is pending, the pending action is canceled and the agent is still advised of what was selected/deselected at the time.
- If the new prompt is of a character to modify and re-present a new or modified action plan, the agent can respond accordingly.
