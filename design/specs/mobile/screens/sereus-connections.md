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

- **(+)** to add a remote node — **Scan node code** (primary), paste a code or an address, or **Add Cloud/Drone** (seed)
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

Three ways in, in order of preference:

1. **Node code (claim)** — a node started with `CADRE_CLAIM_SECRET` shows a code
   `sereus-join:1.…` (QR, link or text; cadre-host shows it as a QR).  It carries the
   node's peer ID, addresses and one-time claim secret.  The code arrives by:
   - **Scan node code** — in-app camera (`src/cadre/NodeCodeScanner.tsx`);
   - **Paste** — the Add Node box accepts a code or an address; its button reads
     "Add node" for a code, "Connect" for an address;
   - **Link** — the system camera or a tapped `sereus-join:` link (Android; see
     `global/deep-links.md`) opens the app on this screen with the code.

   Every path shows an **approval prompt** first — your cadre (Network ID), owner
   fingerprint (first 8 chars of the owner key; the node prints the same once it joins),
   node (short peer ID), and reach ("from anywhere" vs "home Wi-Fi only").  A link can be
   sent by anyone, so nothing is claimed without this approval.  On approve,
   `claimNode` proves the secret, delivers the seed and only then authorizes the node; a
   failure leaves nothing behind.  Failures are worded by kind (unreachable — with
   home-network vs anywhere advice; refused — already claimed / wrong code / rate-limited /
   couldn't save; other) and offer **Try again** when the same code can still work.  The
   progress line notes slow addresses after 20 s (a claim to an unreachable node takes up
   to ~2 min).  One claim at a time; a code that arrives during a prompt or claim is
   dropped with a note.
2. **Address (connect)** — a node started with `--listen-for-seeds --pin-owner-key <key>`
   is added by its multiaddr: `addDrone` → `deliverSeed` → reconcile.  Needs the owner key
   copied to the node (**Show this device's owner key**).
3. **Add Cloud/Drone (seed)** — `createDroneSeed()` mints a seed shown in a copyable modal,
   for a node whose address isn't known yet (`cadre start --seed`).

The node-code pieces (`src/cadre/`: `nodeCode.ts`, `nodeCodeLink.ts`, `nodeCodeInbox.ts`,
`NodeCodeScanner.tsx`) import no health code and return reason codes rather than text, so
other Sereus RN apps can reuse them; they are candidates for `@serfab/cadre-rn`.

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

## Loading (must never hang)

Control-DB reads (`OwnerKey`, `CadrePeer`) go through a **consistent** read that needs a
control-network quorum. On a **solo node** (no drone/cohort yet) that read blocks forever,
so the data layer **time-boxes** each read (~5s, run concurrently) and renders with whatever
returned. The screen therefore always shows the Network ID + "This device" + empty sections
on first visit rather than sitting on a perpetual "Loading" spinner. Once a cohort exists,
the reads return in well under the timeout.

## Connectivity

On screen entry, probe Fret (DHT) for peer status: Online, Unknown, Unreachable. *(Status
currently renders as Unknown for remotes until live probing is wired.)*
