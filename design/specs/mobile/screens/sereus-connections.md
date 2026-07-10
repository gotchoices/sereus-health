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

- **(+)** to add a remote node — **Add Cloud/Drone** (implemented) or **Scan Server QR** (future)
- Each node: device icon, name, status (Online/Unknown/Unreachable), Peer ID (tap to copy), trash
- This device always appears first

### Strand Guests

- **(+)** to invite a guest (health professional). **Invitations are one-directional** —
  health mints and shares them; it never redeems an inbound invitation.
- Each guest: icon, name, status, Member ID, trash (revoke)

## First Visit

CadreNode starts at app startup (local strand is the storage backend).
By the time the user reaches this screen:

1. Party ID exists (auto-generated at first startup).
2. This device appears as the first node.
3. My Keys is empty — authority key not needed for local storage.
4. Add-node / add-guest are **not gated on a visible key**: because a solo node can't
   reliably *read* the control DB (no cohort → no quorum), these flows **arm the
   authority key on demand** (`createAuthorityKey()`, idempotent, time-boxed) rather
   than blocking on a key-exists check.

## Add Node (implemented)

- **Add Cloud/Drone** — `createDroneSeed()` (self-arms the authority key) produces a
  base64url **seed**, shown in a copyable modal, to hand to a drone/server via cadre-cli.
  This is the primary path for interfacing with a cadre drone node.
- **Scan Server QR** (future) — scan QR/link → parse invite → dial the server.

## Invite Guest (implemented, one-directional)

- `createGuestInvitation()` mints an open invitation to the health strand (24h expiry),
  shown in a copyable modal. **Precondition**: the phone needs a dialable address, which
  it only has once a drone/server is in its cadre — until then this fails fast with a clear
  message ("add a node first"). This mirrors chat's solo-node limitation.

## Generated secrets

Node seeds and guest invitations are shown in a modal with **Copy** + **Close**; both are
sensitive (membership secrets / strand access) — share only over a trusted channel.

## Remove

Full removal from the cadre control DB is not yet exposed by cadre-core; removing a row
drops it from this view only, and the UI says so.

## Connectivity

On screen entry, probe Fret (DHT) for peer status: Online, Unknown, Unreachable. *(Status
currently renders as Unknown for remotes until live probing is wired.)*
