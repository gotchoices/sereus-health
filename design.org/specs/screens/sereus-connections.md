# SereusConnections Screen Spec

## Overview
View and manage Sereus nodes that make up Bob's distributed database network. Nodes are part of a DHT (distributed hash table) - they're either online and reachable or not.

## Node Card Fields

Each node card displays:

| Field | Description |
|-------|-------------|
| **Icon** | Device type icon (phone, server, desktop) |
| **Common Name** | User-friendly name (e.g., "My iPhone", "Dr. Smith's Office") |
| **Status** | `Online` or `Unreachable` (not "syncing" - DHT doesn't sync traditionally) |
| **Peer ID** | Truncated libp2p-style peer ID (e.g., `QmYwA...3Kx9`) with copy action |
| **Action** | Remove/disconnect icon |

## Status Semantics

- **Online**: Node is reachable on the DHT, can participate in reads/writes
- **Unreachable**: Node is not currently responding; data is still safe on other nodes

No "syncing" state - the DHT handles consistency automatically. Nodes don't "sync" in user-visible ways.

## Action Icons

### For Cadre Nodes (My Nodes)
- **Trash** (`trash-outline`): Remove from my cadre
  - Destructive action, requires confirmation
  - Affects data redundancy

### For Guest Nodes (Shared Access)
Consider alternatives to trash for "revoke access":
- **Link broken** (`link-off` or `unlink`): Visually suggests disconnecting
- **Person remove** (`person-remove-outline`): Suggests revoking someone's access
- **Exit** (`exit-outline`): Suggests the node is leaving the network
- **Close circle** (`close-circle-outline`): Generic removal

**Recommendation**: Use `unlink` or `link-off` for guest nodes to distinguish from deletion. Guest removal is about revoking access, not deleting data.

## Peer ID Display

Format: First 6 chars + `...` + last 4 chars
- Full: `QmYwAPJzv5CZsnA625s3Xf2nemtYgPpHdWEz79ojWnPbdG`
- Display: `QmYwAP...bdG`

Tap to copy full Peer ID to clipboard (with toast confirmation).

## Sections

### My Nodes (Cadre)
Nodes Bob owns and controls. These store his data for redundancy.
- Can add via QR scan
- Can remove (with data safety warning)

### Guest Nodes
Nodes from trusted parties (doctor, clinic) that have read access.
- Can add via QR scan  
- Can revoke access (uses `unlink` icon)
- Shows source/affiliation (e.g., "Family Medicine Clinic")

## Empty States

### No Cadre Nodes
Should not happen in practice - the phone itself is always a node. But if shown:
- "Your device is your first node"
- Prompt to add additional nodes for redundancy

### No Guest Nodes
- "No shared access"
- "Scan a QR code from a healthcare provider to share your data"

## Mock Data Schema

```typescript
interface SereusNode {
  id: string;
  name: string;                           // Common name
  type: 'cadre' | 'guest';
  deviceType: 'phone' | 'server' | 'desktop' | 'other';
  status: 'online' | 'unreachable';       // Simplified from online/offline/syncing
  peerId: string;                         // libp2p-style peer ID
  addedAt: string;                        // ISO 8601
  source?: string;                        // For guests: who shared it
}
```

## Adding Nodes

### Primary Flow (Per Story)
1. External source (server dashboard, clinic reception) generates QR code containing deep link
2. User scans QR with phone camera app (not Sereus Health)
3. Deep link (`health://sereus/add-node?peerId={id}&type={cadre|guest}&name={name}`) opens Sereus Health
4. Sereus Health shows confirmation dialog with node details
5. User confirms → node added to appropriate section

### In-App Convenience (Header QR Button)
- Tapping the QR icon in the header launches the device camera for scanning
- Same result: scanned QR content parsed as deep link → confirmation dialog
- Requires native camera/QR module (e.g., `react-native-vision-camera`)
- This is a shortcut - the story flow works without it

### Deep Link Schema
```
health://sereus/add-node
  ?peerId=QmYwAPJzv5CZsnA625s3Xf2nemtYgPpHdWEz79ojWnPbdG
  &type=cadre|guest
  &name=Dr.%20Smith%27s%20Office    (optional, user can edit)
  &deviceType=server|phone|desktop  (optional)
```

## Accessibility

- Status announced as "Online" or "Unreachable"
- Peer ID has "Copy peer ID" accessibility label
- Remove actions have clear labels: "Remove node" vs "Revoke access"

