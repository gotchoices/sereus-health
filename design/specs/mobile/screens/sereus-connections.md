# SereusConnections Screen Spec

## Purpose

View and manage the user’s Sereus connections (other devices/services that can participate in sharing or redundancy).

## Layout

- Header: title “Sereus Connections”
  - Optional **Scan / Add** action
- Content: two sections:
  - **My devices** (devices the user controls)
  - **Shared access** (connections to trusted third parties)

## Connection row (card)

Each connection row shows:

- **Icon**: device type (phone/server/desktop/other)
- **Name**: user-friendly label
- **Status**: `Online` or `Unreachable`
- **Identifier**: truncated ID with a copy action (“Copy ID”)
- **Action**:
  - My devices: **Remove**
  - Shared access: **Revoke access**

### Status meaning

- **Online**: currently reachable.
- **Unreachable**: not currently reachable. This does not necessarily imply data loss.

No “syncing” state is required in the UI.

## Add connection

The user can add a connection by scanning a code provided by another device or a trusted party.

- On scan, show a confirmation step with the connection’s name/type (and ID if present).
- User confirms → connection appears in the appropriate section.
- If scan content is invalid, show a clear error.

## Remove / revoke

- **Remove (my device)**:
  - Requires confirmation.
  - Warn that removing devices may reduce redundancy.
- **Revoke access (shared)**:
  - Requires confirmation.
  - Clearly indicates it revokes access rather than “deleting data.”

## Empty states

- **My devices**:
  - If shown empty (rare), state that “This device is your first node” and prompt to add another for redundancy.
- **Shared access**:
  - “No shared access”
  - CTA: “Scan a code to connect”

## Accessibility

- Status announced as “Online” or “Unreachable”.
- Copy action labeled “Copy ID”.
- Actions labeled distinctly: “Remove device” vs “Revoke access”.
