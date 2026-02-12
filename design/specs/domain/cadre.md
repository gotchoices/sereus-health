# Cadre Management

Apps rely on [@sereus/cadre-core](https://github.com/gotchoices/sereus.git) for cadre and strand management.

For architecture, enrollment flows, and API details, see `sereus/docs/cadre-architecture.md`.

## Storage Architecture

Health data is stored in an **optimystic strand database** managed by CadreNode.
The app auto-bootstraps a single-node cadre on first run (party ID, identity
keypair, authority key, health strand). No manual setup required — the user
logs data immediately.

Adding remote nodes (replication, backup) and strand guests (sharing with a
doctor) are opt-in via the Sereus Connections screen.

The previous `rn-leveldb` storage backend is deprecated; migration to
optimystic (`IRawStorage` / `MMKVRawStorage`) is in progress.

## Implementation References

- **CadreNode API**: `sereus/packages/cadre-core/README.md`
- **Control database schema**: `sereus/docs/cadre-architecture.md` — `AuthorityKey`, `CadrePeer`, `Strand` tables; query via Quereus SQL (`db.eval()`)
- **Storage**: `@optimystic/db-p2p` `IRawStorage`; RN: `@optimystic/db-p2p-storage-rn` (`MMKVRawStorage`)
- **Enrollment flows**: `sereus/docs/cadre-architecture.md` — seed bootstrap, four modes (phone→drone, server→phone, server→drone, phone→phone via relay)
- **RN transports**: `webSockets()` + `circuitRelayTransport()` (no TCP in RN); bootstrap/relay via DNSADDR

## Core Concepts

- **Cadre**: A user's personal cluster of devices (phone, server, NAS, etc.)
- **Party ID**: UUID identifier for the cadre; auto-generated on first run
- **Control Network**: Private database shared by cadre nodes (manages membership and strands)
- **Strand**: Shared data space backed by an optimystic database
- **Strand Guests**: Third parties with strand-level access (e.g., a doctor)

## Authority Keys

Keys authorize cadre changes (adding nodes, inviting guests). The schema permits one bootstrap insert without existing authorization (`count(AuthorityKey) <= 1`).

- **Local vault**: Keychain/Keystore; biometric or login protection
- **External**: exportable as JWK file or QR code
- **Dongle**: hardware signing device (future)

When signing: search local vault first; if not found, prompt for external key.

## Enrollment

- **Phone adds drone/server**: `createSeed()` → deliver via provider API → dial
- **Server adds phone**: scan QR/link (partyId + multiaddr) → dial server
- **Phone adds phone** (future): relay-routed multiaddr via `getRelayAddress()`

The NAT'd device always dials out to the publicly-reachable device.
