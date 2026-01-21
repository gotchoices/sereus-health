# SereusConnections Screen Consolidation

---
provides:
  - screen:mobile:SereusConnections
dependsOn:
  - design/specs/mobile/screens/sereus-connections.md
  - design/specs/domain/cadre.md
  - design/specs/mobile/navigation.md
  - design/specs/mobile/global/ui.md
---

## Purpose

View and manage the user's Sereus network: keys, nodes, and strand guests.

## Screen Identity

- **Route**: `SereusConnections` (push from Settings)
- **Title**: "Sereus Connections"

## Layout

Per spec, four content sections in order:

1. **Network ID** — Party ID with tap-to-copy
2. **My Keys** — Authority keys that authorize changes
3. **My Nodes** — Devices in the user's cadre
4. **Strand Guests** — Trusted third parties with strand access

## Data Model

```typescript
interface AuthorityKey {
  id: string;
  type: 'vault' | 'dongle' | 'external';
  protection: 'login' | 'biometric' | 'password';
  publicKey: string;  // Abbreviated for display
}

interface SereusNode {
  id: string;
  name: string;
  type: 'cadre' | 'guest';
  deviceType: 'phone' | 'server' | 'desktop' | 'other';
  status: 'online' | 'unknown' | 'unreachable';
  peerId: string;
  addedAt: string;
  source?: string;  // For guests: who shared it
}

interface SereusConnectionsState {
  partyId: string | null;      // Network ID
  keys: AuthorityKey[];
  cadreNodes: SereusNode[];
  guestNodes: SereusNode[];
  loading: boolean;
  error?: string;
}
```

## Section Details

### Network ID

- Display abbreviated Party ID (first 8 chars + "...")
- Tap to copy full ID to clipboard
- Toast confirmation on copy

### My Keys

- **(+)** button to add key (opens add-key flow)
- List of keys, each showing:
  - Icon: `key-outline` (vault), `hardware-chip-outline` (dongle), `document-outline` (external)
  - Type label
  - Protection label
  - Abbreviated public key
- Empty state: "No keys yet" with CTA to add first key

### My Nodes

- **(+)** button disabled until at least one key exists
- Each node shows: device icon, name, status dot, Peer ID, trash action
- Empty state: "No nodes" (but main empty state covers first-run)

### Strand Guests

- **(+)** button disabled until at least one key exists
- Each guest shows: icon, name, status, Member ID, revoke action
- Empty state: "No shared access"

## First Run / Empty State

Per spec:
1. No keys → My Keys empty, (+) for Nodes/Guests disabled
2. Show guidance to create first key

## Status Detection

On screen entry, probe Fret (DHT) layer for peer status:
- `online` — connected
- `unknown` — not yet checked
- `unreachable` — not responding

## Mock Variants

### happy

```json
{
  "partyId": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  "keys": [
    { "id": "k1", "type": "vault", "protection": "biometric", "publicKey": "0x1234...abcd" }
  ],
  "cadreNodes": [
    { "id": "n1", "name": "My iPhone", "type": "cadre", "deviceType": "phone", "status": "online", "peerId": "12D3KooW..." }
  ],
  "guestNodes": [
    { "id": "g1", "name": "Dr. Smith's Office", "type": "guest", "deviceType": "server", "status": "online", "source": "Family Medicine" }
  ]
}
```

### empty

```json
{
  "partyId": null,
  "keys": [],
  "cadreNodes": [],
  "guestNodes": []
}
```

## i18n Keys

```
sereus.title: "Sereus Connections"
sereus.networkId: "Network ID"
sereus.myKeys: "My Keys"
sereus.myNodes: "My Nodes"
sereus.strandGuests: "Strand Guests"
sereus.noKeys: "No keys yet"
sereus.addFirstKey: "Add your first key to get started"
sereus.noNodes: "No nodes"
sereus.noGuests: "No shared access"
sereus.statusOnline: "Online"
sereus.statusUnknown: "Unknown"
sereus.statusUnreachable: "Unreachable"
sereus.copied: "Copied to clipboard"
sereus.removeCadreTitle: "Remove Node"
sereus.removeCadreBody: "Remove this device from your cadre?"
sereus.revokeGuestTitle: "Revoke Access"
sereus.revokeGuestBody: "Revoke this guest's access?"
```

## Implementation Notes

- Use `Clipboard.setString()` for Party ID copy
- Key icons: map type to Ionicons name
- Status colors: online=green, unknown=gray, unreachable=red
- (+) buttons: disabled state when no keys exist

---

**Status**: Updated to match spec with Network ID and My Keys sections
**Last Updated**: 2026-01-20
