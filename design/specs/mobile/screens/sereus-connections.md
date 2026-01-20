# SereusConnections Screen Spec

## Purpose

View and manage the user's [Sereus](https://sereus.org) network: keys, nodes, and strand guests.

See `domain/cadre.md` for cadre concepts, key management, and enrollment patterns.

## Layout

- Header: "Sereus Connections"
- Content sections: Network ID, My Keys, My Nodes, Strand Guests

### Network ID

Displays the user's Party ID (private network identifier) with tap-to-copy.

### My Keys

Authority keys that authorize changes to the network.

- **(+)** to add a key (see `domain/cadre.md` for key types)
- Each key shows: type icon (vault/dongle/external), protection (login/password/biometric), public key (abbreviated; expandable)

### My Nodes

Devices in the user's cadre that store/sync data.

- **(+)** to add a node (disabled until a key exists)
- Each node shows: device icon (phone/server/desktop/other), name, status (Online/Unknown/Unreachable), Peer ID (tap to copy), trash (remove)

### Strand Guests

Trusted third parties with strand-level access (see `domain/cadre.md`).

- **(+)** to invite a guest (disabled until a key exists)
- Each guest shows: icon, name, status (Online/Unknown/Unreachable), Member ID, trash (revoke)

## First Run

1. App initializes cadre schema (control database).
2. No keys exist → My Keys empty.
3. **(+)** for Nodes and Guests disabled until a key is created.

## Add Node

- **Phone adds Drone**: phone creates seed, sends via provider API, then dials drone
- **Server adds Phone**: phone scans QR/link (partyId + serverMultiaddr), dials server directly

See `domain/cadre.md` for enrollment pattern details.

## Connectivity

On screen entry, app probes the Fret (DHT) layer to determine peer status: Online, Unknown, or Unreachable.
