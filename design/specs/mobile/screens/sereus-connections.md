# SereusConnections Screen Spec

## Purpose

View and manage the user's Sereus network: keys, nodes, and strand guests.

See `domain/cadre.md` for concepts, implementation references, and enrollment patterns.

## Layout

- Header: "Sereus Connections"
- Sections: Network ID, My Keys, My Nodes, Strand Guests

### Network ID

Party ID with tap-to-copy. Show as much as fits on a single line.

### My Keys

- **(+)** to add a key (see `domain/cadre.md` for types); dongle shown disabled (future)
- Each key: type icon, protection label, public key (abbreviated; expandable)

### My Nodes

- **(+)** to add a remote node (disabled until a key exists)
- Each node: device icon, name, status (Online/Unknown/Unreachable), Peer ID (tap to copy), trash
- This device always appears first

### Strand Guests

- **(+)** to invite a guest (disabled until a key exists)
- Each guest: icon, name, status, Member ID, trash (revoke)

## First Run

The cadre auto-bootstraps at app startup (see `domain/cadre.md`). By the time the user reaches this screen:

1. Party ID exists.
2. This device appears as the first (and only) node.
3. A bootstrap authority key exists.
4. **(+)** for remote nodes and guests is enabled.

## Add Node

- **Phone adds Drone**: `createSeed()` → provider API → dial
- **Server adds Phone**: scan QR/link → dial server

## Connectivity

On screen entry, probe Fret (DHT) for peer status: Online, Unknown, Unreachable.
