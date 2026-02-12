# SereusConnections Screen Spec

## Purpose

View and manage the user's [Sereus](https://sereus.org) network: keys, nodes, and strand guests.

See `domain/cadre.md` for cadre concepts, key management, and enrollment patterns.

## Implementation References

- **CadreNode API**: `sereus/packages/cadre-core/README.md` — constructor, lifecycle (`start`/`stop`), events, seed bootstrap, strand solicitation.
- **Control database**: `sereus/docs/cadre-architecture.md` — `CadreControl` schema tables (`AuthorityKey`, `CadrePeer`, `Strand`). Query via Quereus SQL.
- **Storage**: `@optimystic/db-p2p` `IRawStorage` interface; RN implementation in `@optimystic/db-p2p-storage-rn` (`MMKVRawStorage`).
- **Enrollment flows**: `sereus/docs/cadre-architecture.md` — seed bootstrap protocol, four enrollment modes (phone→drone, server→phone, server→drone, phone→phone via relay).
- **RN transports**: `webSockets()` + `circuitRelayTransport()` from libp2p (no TCP in RN). Bootstrap/relay via DNSADDR.

## Layout

- Header: "Sereus Connections"
- Content sections: Network ID, My Keys, My Nodes, Strand Guests

### Network ID

Displays the user's Party ID (private network identifier) with tap-to-copy.

### My Keys

Authority keys that authorize changes to the network.

- **(+)** to add a key (see `domain/cadre.md` for key types)
- Each key shows: type icon (vault/dongle/external), protection (login/password/biometric), public key (abbreviated; expandable)
- Dongle type shown disabled (future)

### My Nodes

Devices in the user's cadre that store/sync data.

- **(+)** to add a node (disabled until a key exists)
- Each node shows: device icon (phone/server/desktop/other), name, status (Online/Unknown/Unreachable), Peer ID (tap to copy), trash (remove)

### Strand Guests

Strand members other than the owner, invited to join specific strands (e.g., a doctor). See `domain/cadre.md`.

- **(+)** to invite a guest (disabled until a key exists)
- Each guest shows: icon, name, status (Online/Unknown/Unreachable), Member ID, trash (revoke)

## First Run

1. App initializes `CadreNode` with `profile: 'transaction'`, `strandFilter: { mode: 'sAppId', sAppId: 'org.sereus.health' }`, and `MMKVRawStorage` provider.
2. Party ID generated; identity keypair persisted to device secure storage.
3. No keys exist → My Keys empty.
4. **(+)** for Nodes and Guests disabled until a key is created.

## Add Node

- **Phone adds Drone**: phone creates seed (`createSeed()`), sends via provider API, then dials drone.
- **Server adds Phone**: phone scans QR/link (partyId + serverMultiaddr), dials server directly.
- **Phone adds Phone** (future): authority phone obtains relay address (`getRelayAddress()`), creates seed with relay-routed multiaddr, delivers out-of-band. New phone dials through relay.

See `domain/cadre.md` for enrollment pattern details.

## Connectivity

On screen entry, app probes the Fret (DHT) layer to determine peer status: Online, Unknown, or Unreachable.
