# Cadre Management

Apps rely on [@serfab/cadre-core](https://github.com/gotchoices/sereus.git) for cadre and strand management.

For architecture, enrollment flows, and API details, see `sereus/docs/architecture.md`.

## Storage Architecture

Health data is stored in an **optimystic strand database** managed by CadreNode.
On first run the app auto-generates a party ID and starts a local health
strand. No authority key or networking setup is required for local storage —
the user logs data immediately.

The owner key and strand publication happen at first start; adding a cadre
node then replicates health data to it automatically. A strand works alone and
with nodes alike: nothing is torn down or re-added when a node appears.

Storage: the health strand and the control/node-local stores are optimystic
block stores over the `rn-leveldb` native module.

## Write Outcomes and Sync Status

A save completes on this device: the record is stored locally and is visible
everywhere in the app at once. Sharing it with the user's other cadre machines
happens afterwards, in the background, and does not hold up the user. A cadre is
a distributed database, not a backup: "synced" below means held by the cadre, and
**backup** means only the deliberate export ([import-export.md](import-export.md)).

Every saved change is in one of these states:

| State | Meaning for the user |
|---|---|
| **On this device only** | Saved here and in use, but no other cadre machine holds it yet. Losing this device now would lose it. |
| **Synced** | At least one other machine in the cadre holds it. It survives losing this device. |
| **Not saved** | The cadre refused the change (rare: for example a conflicting edit from another of the user's devices). It is no longer shown as data, and the user is told what was not saved and why. |

Rules:

- A change moves only forward: on this device only → synced, or on this device
  only → not saved. Synced is final.
- With no cadre nodes, every change stays on this device only. That is the normal
  state of a solo user, not an error.
- A change that is on this device only survives the app being closed or the
  device restarting, and keeps syncing afterwards.
- A change is never reported as not saved silently, and never committed twice.
- The app shows these states (see mobile `global/async-activity.md` → Sync
  status); it does not compute them. How the stack determines them, and what it
  guarantees, is Sereus's to define: `sereus/docs/strands.md` → "A commit's
  durability" (and its offline-mode successor once released).

## Implementation References

- **CadreNode API**: `sereus/packages/cadre-core/README.md`
- **Control database schema**: `sereus/docs/architecture.md` — `CadrePeer`, `Strand` and related tables; query via Quereus SQL (`db.eval()`)
- **Commit durability**: `sereus/docs/strands.md` → "A commit's durability"
- **Enrollment flows**: `sereus/docs/architecture.md` → "Enrollment and Bootstrap"
- **RN transports**: WebSockets, circuit relay and WebRTC (no TCP on React Native); see `metro.config.js` and `index.js`

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
