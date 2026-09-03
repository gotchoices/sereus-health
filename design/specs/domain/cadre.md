# Cadre Management

Apps rely on [@serfab/cadre-core](https://github.com/gotchoices/sereus.git) for cadre and strand management.

For architecture, enrollment flows, and API details, see `sereus/docs/cadre-architecture.md`.

## Storage Architecture

Health data is stored in an **optimystic strand database** managed by CadreNode.
On first run the app auto-generates a party ID and starts a local health
strand via `addStrand()`. No authority key or networking setup is required
for local storage — the user logs data immediately.

The owner key, strand publication, and CadrePeer registration happen on the
founder path at first start (owner genesis + `publishStrand`); adding a remote
node's bootstrap address then replicates health data to it automatically. Under
cadre-core 0.12 there is no longer a per-strand `mode` ('bootstrap'/'networked') —
solo/local commit is automatic, so a strand does not need to be torn down and
re-added when a peer appears.

Storage: the health strand and the control/node-local repos are all backed by
`LevelDBRawStorage` (`@optimystic/db-p2p-storage-rn`) over the `rn-leveldb`
native module — an internal optimystic block store, distinct from the legacy
per-table direct-LevelDB layout (`db/config.ts` Mode B).

## Implementation References

- **CadreNode API**: `sereus/packages/cadre-core/README.md`
- **Control database schema**: `sereus/docs/cadre-architecture.md` — `AuthorityKey`, `CadrePeer`, `Strand` tables; query via Quereus SQL (`db.eval()`)
- **Storage**: `@optimystic/db-p2p` `IRawStorage`; RN: `@optimystic/db-p2p-storage-rn` (`MMKVRawStorage`)
- **Enrollment flows**: `sereus/docs/cadre-architecture.md` — seed bootstrap, four modes (phone→drone, server→phone, server→drone, phone→phone via relay)
- **RN transports** (cadre-core 0.12): `webSockets()` + `circuitRelayTransport()` + `webRTC()`
  (no TCP in RN). WebSockets dials a reachable node; circuit-relay dials `/p2p-circuit`
  reservations through a relay-enabled node; webRTC upgrades a relayed connection to a direct
  path. `metro.config.js` forces the `browser` variants of `@libp2p/crypto`/`@libp2p/webrtc`,
  and `index.js` installs `react-native-webrtc`'s globals.

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
