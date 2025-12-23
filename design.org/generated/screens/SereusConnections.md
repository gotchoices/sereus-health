# SereusConnections Screen Consolidation

---
provides: ["screen:SereusConnections"]
dependsOn:
  - design/stories/07-networking.md
  - design/specs/navigation.md
  - design/specs/screens/index.md
  - design/specs/global/general.md
---

## Purpose
View and manage Sereus nodes that make up Bob's network—both his own cadre nodes and guest nodes shared by healthcare providers and other trusted parties.

## Screen Identity
- **Route**: `SereusConnections` (push from Settings)
- **Title**: "Sereus Connections"
- **Deep Link**: `health://screen/SereusConnections?variant={happy|empty}`

## User Journey Context
From stories:
- **07-networking.md**:
  - Bob scans QR codes to add nodes to his network
  - Nodes can be "cadre" (Bob controls) or "guest" (someone else controls)
  - He can view his whole cohort in settings
  - He can remove nodes any time
  - Data is distributed across nodes for safety

## Layout & Information Architecture

### Header
- **Back Button** (left): Returns to Settings
- **Title**: "Sereus Connections" (centered)
- **Add Button** (right): QR scan icon to add new node

### Main Content Area

#### When Nodes Exist
Two sections:

**My Nodes (Cadre)**
- Section header with count badge
- List of nodes Bob controls:
  - **Node name/identifier**
  - **Device type** icon (phone, server, etc.)
  - **Status indicator** (online/offline/syncing)
  - **Last sync time**: "2 min ago" or "Yesterday"
  - **Remove action**: Swipe or menu

**Guest Nodes**
- Section header with count badge
- List of shared nodes from others:
  - **Node name/source** (e.g., "Dr. Smith's Office")
  - **Type indicator**: "Guest" badge
  - **Status indicator**
  - **Last sync time**
  - **Remove action**: Swipe or menu

#### Empty State (no nodes)
- Cloud icon (large, centered)
- Title: "No nodes connected"
- Subtitle: "Scan a QR code to add your first Sereus node"
- CTA: "Scan QR Code" button

### Floating Action
- QR scan button (or use header action)

## Interaction Patterns

### Primary Actions
1. **Add Node** (QR scan):
   - Opens camera for QR scanning
   - Parses deep link: `health://sereus/add-node?nodeId={id}&type={cadre|guest}`
   - Shows confirmation prompt before adding
   - Distinguishes cadre vs guest based on QR data

2. **Remove Node**:
   - Swipe-to-reveal delete or long-press menu
   - Confirmation dialog: "Remove this node from your network?"
   - Cadre removal: Warn about data safety implications
   - Guest removal: Simpler confirmation

3. **View Node Details** (future):
   - Tap node card for detailed status
   - Sync history, connection info

### Navigation
- **Back**: Returns to Settings
- **Deep Links**: 
  - `health://screen/SereusConnections` - view screen
  - `health://sereus/add-node?nodeId={id}&type={cadre|guest}` - add node flow

## Data Model

### Node
```typescript
interface SereusNode {
  id: string;
  name: string;
  type: 'cadre' | 'guest';
  deviceType: 'phone' | 'server' | 'desktop' | 'other';
  status: 'online' | 'offline' | 'syncing';
  lastSync: string;           // ISO 8601 timestamp
  addedAt: string;            // ISO 8601 timestamp
  source?: string;            // For guest nodes, who shared it
}
```

### Screen State
```typescript
interface SereusConnectionsState {
  cadreNodes: SereusNode[];
  guestNodes: SereusNode[];
  loading: boolean;
  error?: string;
}
```

## Mock Variants

### happy
- 2 cadre nodes:
  - "My iPhone" (phone, online, synced 2 min ago)
  - "Home Server" (server, online, synced 5 min ago)
- 2 guest nodes:
  - "Dr. Smith's Office" (server, online)
  - "Family Clinic" (server, offline)

### empty
- No nodes at all
- Shows empty state with CTA

## Theming & Accessibility
- **Theme**: Follow system light/dark mode
- **Colors**:
  - Background: `theme.background`
  - Cards: `theme.surface` with `theme.border`
  - Online status: Green (#36B37E)
  - Offline status: Gray (#8993A4)
  - Syncing status: Blue (#4C9AFF)
  - Remove action: Red (#FF5630)
- **Touch Targets**: Minimum 44×44pt
- **Accessibility**: 
  - Node cards announce name, type, status
  - Status changes announced

## i18n Keys
```
sereus.title: "Sereus Connections"
sereus.cadreNodes: "My Nodes"
sereus.guestNodes: "Guest Nodes"
sereus.addNode: "Add Node"
sereus.scanQR: "Scan QR Code"
sereus.removeNode: "Remove Node"
sereus.emptyTitle: "No nodes connected"
sereus.emptyMessage: "Scan a QR code to add your first Sereus node"
sereus.confirmRemove: "Remove this node from your network?"
sereus.confirmRemoveCadre: "Removing your own node may affect data safety. Continue?"
sereus.statusOnline: "Online"
sereus.statusOffline: "Offline"
sereus.statusSyncing: "Syncing..."
sereus.lastSync: "Last sync: {time}"
sereus.addConfirmCadre: "Add this node to your cadre?"
sereus.addConfirmGuest: "Add this guest node to your network?"
```

## Design Rationale

### Why Two Sections?
- **Story Evidence**: Distinction between "cadre" (Bob's nodes) and "guest" (shared) is important
- **Mental Model**: Users understand ownership/control implications
- **Visual Clarity**: Different sections help scan quickly

### Why QR Code for Adding?
- **Story Evidence**: "He scans the QR with his phone camera"
- **Security**: QR contains node credentials, harder to type
- **Convenience**: Quick pairing without manual entry

### Why Show Status?
- **Confidence**: Users want to know their data is syncing
- **Troubleshooting**: Helps identify connection issues
- **Real-time**: Story emphasizes "real-time access to my data"

## Component Reuse
- **Theme Hook**: `useTheme()` for current palette
- **i18n Hook**: `useT()` for all UI strings
- **Confirmation Dialog**: Shared dialog component

## Open Questions / Future Enhancements
- **Node Details Screen**: Tap for sync history, advanced settings
- **Manual Node Entry**: Add by URL/ID for desktop users
- **Permission Scoping**: Control what data each guest can access
- **Sync Status Details**: Show what's syncing, progress

---

**Status**: Fresh consolidation
**Last Updated**: 2025-12-03

