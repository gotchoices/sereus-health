# SereusConnections Screen Consolidation

---
provides:
  - screen:mobile:SereusConnections
dependsOn:
  - design/specs/mobile/screens/sereus-connections.md
  - design/specs/domain/cadre.md
  - design/specs/mobile/navigation.md
  - design/specs/mobile/global/ui.md
  - sereus/packages/cadre-core/README.md
  - sereus/docs/cadre-architecture.md
---

## Purpose

View and manage the user's Sereus network: keys, nodes, and strand guests.

## Screen Identity

- **Route**: `SereusConnections` (push from Settings)
- **Title**: "Sereus Connections"

## Layout

Four content sections in a `ScrollView`:

1. **Network ID** — Party ID with tap-to-copy
2. **My Keys** — Authority keys that authorize changes
3. **My Nodes** — Devices in the user's cadre
4. **Strand Guests** — Strand members other than the owner (e.g., a doctor)

## Data Layer

### CadreService singleton (`src/services/CadreService.ts`)

Wraps `CadreNode` from `@sereus/cadre-core`.  Lifecycle: `initialize()` → `start()` → `stop()`.

```typescript
import { CadreNode, type CadreNodeConfig } from '@sereus/cadre-core';

const SAPP_ID = 'org.sereus.health';

// Bootstrap/relay via DNSADDR; operators update DNS without app deploy.
const BOOTSTRAP_NODES = ['/dnsaddr/bootstrap.sereus.org'];
const RELAY_ADDRS = ['/dnsaddr/relay.sereus.org'];
```

Config:

- `profile: 'transaction'` (mobile)
- `strandFilter: { mode: 'sAppId', sAppId: SAPP_ID }`
- `network.transports: [webSockets(), circuitRelayTransport()]` — no TCP in RN
- `network.listenAddrs: []` — RN nodes cannot listen
- `network.relayAddrs: RELAY_ADDRS`
- `storage.provider: (strandId) => new MMKVRawStorage(strandId)` — per-strand isolation via `@optimystic/db-p2p-storage-rn`

Identity keypair (Ed25519) persisted to device secure storage (Keychain/Keystore) as protobuf `Uint8Array`; loaded on subsequent launches via `privateKey` config field.

Exposes:

- `isRunning: boolean`
- `partyId: string | null`
- `getControlDatabase(): ControlDatabase | null`
- Event forwarding: `control:connected`, `control:disconnected`, strand events

### Data queries (`src/data/sereusConnections.ts`)

When CadreService is running, query the `CadreControl` schema via Quereus SQL through `ControlDatabase`:

```sql
-- Authority keys
SELECT * FROM AuthorityKey;

-- Cadre peers
SELECT PeerId, Multiaddr FROM CadrePeer;
```

Node metadata (display name, device type, added-at timestamp) is not stored in the control database.  The app maintains a local `NodeMetadata` table (or AsyncStorage map) keyed by Peer ID for display-only fields.

When CadreService is not running (or for scenario tooling), fall back to mock JSON fixtures.

### Data types

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
  source?: string;  // For guests: who invited them
}

interface SereusConnectionsData {
  partyId: string | null;
  keys: AuthorityKey[];
  cadreNodes: SereusNode[];
  guestNodes: SereusNode[];
}
```

## Section Details

### Network ID

- Display abbreviated Party ID (first 8 chars + "…")
- Tap to copy full ID to clipboard
- Toast confirmation on copy
- Party ID generated on first run; stored in CadreService config

### My Keys

- **(+)** button to add key (opens add-key flow)
- Dongle type shown disabled with "(future)" label
- List of keys, each showing:
  - Icon: `key-outline` (vault), `hardware-chip-outline` (dongle), `document-outline` (external)
  - Type label + protection label
  - Abbreviated public key
- Empty state: "No keys yet" with CTA to add first key

### My Nodes

- **(+)** button disabled until at least one key exists
- Each node shows: device icon, name, status dot, Peer ID (tap to copy), trash action
- Status dot colors: online → green, unknown → gray, unreachable → red
- Empty state: "No nodes"

### Strand Guests

- **(+)** button to invite guest (disabled until at least one key exists)
- Each guest shows: icon, name, status, Member ID (tap to copy), revoke action
- Empty state: "No shared access"

## First Run / Empty State

1. CadreService initializes `CadreNode` (generates Party ID and identity keypair)
2. No keys → My Keys section empty, (+) for Nodes/Guests disabled
3. Guidance text: "Add your first key to get started"

## Actions

### Add Key

Opens a modal/action sheet:
- **Local vault**: generates Ed25519 keypair, stores in Keychain/Keystore. Immediate.
- **External**: generates keypair, offers export as JWK file or QR code.
- **Dongle**: disabled, shows "Coming soon".

### Add Node (enrollment)

Two implemented modes (per spec):
- **Phone adds Drone**: `createSeed()` → deliver seed via provider API → phone dials drone.
- **Server adds Phone**: phone scans QR/link containing `partyId` + server multiaddr → dials server directly.

One future mode:
- **Phone adds Phone**: authority phone gets relay address (`getRelayAddress()`), creates seed with relay-routed multiaddr, delivers out-of-band. Not yet implemented.

### Remove Node

Confirmation dialog → remove peer from `CadrePeer` table.

### Invite Guest

Uses `StrandSolicitationService`: `createOpenInvitation(sAppId)` → encode invitation → share via QR/link.

### Revoke Guest

Confirmation dialog → revoke strand membership.

## Status Detection

On screen entry, probe Fret (DHT) layer for each peer:
- `online` — peer connected or recently seen
- `unknown` — not yet checked
- `unreachable` — dial failed or timed out

## Mock Variants

### happy

```json
{
  "partyId": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  "keys": [
    { "id": "k1", "type": "vault", "protection": "biometric", "publicKey": "0x1234...abcd" }
  ],
  "cadreNodes": [
    { "id": "n1", "name": "My iPhone", "type": "cadre", "deviceType": "phone", "status": "online", "peerId": "12D3KooWAbCd...", "addedAt": "2026-01-15T10:00:00Z" }
  ],
  "guestNodes": [
    { "id": "g1", "name": "Dr. Smith's Office", "type": "guest", "deviceType": "server", "status": "online", "peerId": "12D3KooWEfGh...", "addedAt": "2026-01-20T14:30:00Z", "source": "Family Medicine Clinic" }
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
sereus.addKey: "Add Key"
sereus.addNode: "Add Node"
sereus.inviteGuest: "Invite Guest"
sereus.keyVault: "Local Vault"
sereus.keyExternal: "External"
sereus.keyDongle: "Dongle"
sereus.dongleFuture: "Coming soon"
```

## Implementation Notes

- `CadreService` is a singleton; initialized once at app startup, stopped on background.
- Screen reads data on mount via `CadreService.getControlDatabase()` + SQL queries, with mock fallback for scenario tooling.
- `Clipboard.setString()` for Party ID / Peer ID copy.
- Status dot uses semantic theme colors (green/gray/red).
- (+) buttons: disabled style + opacity when no keys exist.
- Actions (add key, add node, invite guest, remove, revoke) wired to CadreNode API; stub with Alert for unimplemented flows.

---

**Status**: Updated for cadre-core integration (CadreService, SQL queries, enrollment flows, identity persistence)
**Last Updated**: 2026-02-11
