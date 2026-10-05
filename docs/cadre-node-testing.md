# Testing a Linux cadre node with Sereus Health

This describes how to connect the Health app (a phone node) to an always-on
**Linux cadre node** so health data replicates off-device, using the cadre-core
**1.12** stack. Two ways to run the Linux node are covered:

- **cadre-cli drone** — the simplest test rig (recommended to start).
- **cadre-host** — the production-style management plane (grants/invites).

The phone side is the same either way: the phone **dials out** to the reachable
Linux node (a NAT'd phone can't accept inbound), publishes its health strand,
and the node — once it trusts the phone's owner key and has joined the party —
replicates the strand.

> **Prerequisite — wipe on upgrade.** Pre-1.0 has no data migration and the
> 0.22→0.27 optimystic substrate changed. On a device upgraded from the 0.10
> stack: **Settings → Backup & Restore → export**, then **Clear local data**,
> then re-import after the new build is installed.

---

## Stack version notes (sereus 1.12)

- Run the **same sereus release on every machine** of the party. Health is now on
  `@serfab/cadre-core`/`cadre-rn` **1.12.0**, `@optimystic/*` **1.10.1**, `@quereus/*` **4.20.1**,
  `p2p-fret` **1.0.1**. cadre-core 1.12 *requires* optimystic ^1.10.1, so the two always move
  together. **Upgrade the Linux node to the same 1.12 wave before pairing** — health no longer
  matches a drone left on the 1.9 / optimystic-1.8.1 pin it was previously held back to.
- **No control-store wipe is announced for 1.9 → 1.12.** The 1.10, 1.11 and 1.12 release notes
  record no control-store or substrate change (unlike 1.8, below). Treat that as un-verified until
  first pairing succeeds: if the node refuses to open its store, fall back to the 1.8 procedure.
- 1.10 installs the **strand-formation responder on every node at `start()`**, validating
  invitation tokens against the party's own `FormationInvite`/`FormationUsage` rows. Health no
  longer wires a recorder itself (see `CadreService.initialize`), and an always-on Linux node can
  now answer a join for a phone that is offline.
- 1.10 also adds **`requestJoin`**, a join that keeps retrying across restarts until it lands, the
  invitation is spent, or 30 days pass — useful when the inviting phone is intermittently reachable.
- 1.11 **removed TURN**: the `'webrtc-turn'` transport, `ConnectionLike.turnRelayed`,
  `classifyConnectionPath` and `peerKeySigner` are gone, and there is no `/ice-servers.json`
  manifest. A relay now answers STUN on UDP **3478** — open that port when you redeploy the relay,
  and keep the relay **uncapped** (`RELAY_APPLY_DEFAULT_LIMIT` unset/`false`), because Optimystic's
  database protocols do not run over connections a capped relay marks limited.
- 1.11 wants **`PUBLIC_HOST`** set to the name clients dial the relay at; without it (or
  `ANNOUNCE_ADDRS`) the relay advertises loopback/Docker-bridge addresses and logs a warning.
- **1.8 cannot open an older control store.** On a Linux node, delete the
  `control-<party id base64url>` folder inside `storage.path` before starting 1.8 (for cadre-host:
  `<workdir>/storage`); on the phone, clear the app's storage. Then re-form the party.
- **Config is validated strictly** in 1.8: an unknown key or misspelled `CADRE_*` variable stops
  start-up with an error naming it.
- `network.linkRoundTripMs` (default 3500) must be the **same on every machine** if you set it.
  Health leaves it at the default.
- New in 1.8: `cadre enroll add <peerId>` asks a running owner node for a seed for a new machine.
  (Health's owner is the phone, so the in-app **My Nodes (+)** flow is the usual path.)

## Concepts you need from the app

Open **Settings → Sereus Connections**. Two values matter:

- **Network ID (Party ID)** — identifies your cadre. The Linux node must use the
  **same** Party ID.
- **This device's owner key** — tap **My Nodes (+)** → **Show this device's owner
  key**. It's a base64url Ed25519 **public** key (safe to share). The Linux node
  must **trust** this key or it will reject the phone.

The same **My Nodes (+)** modal has:
- a field to **enter the node's bootstrap multiaddr** and **Connect** (dials +
  saves it; re-applied as a bootstrap node on next launch), and
- **Add Cloud/Drone** — mint a base64url **seed** to enroll the node into your
  cadre.

---

## Option A — cadre-cli drone (recommended)

### 1. Create a drone config

`drone.cadre.yaml` (adapt from
`sereus/packages/reference-app-rn/drone.cadre.yaml`):

```yaml
controlNetwork:
  partyId: "<PASTE THE PHONE'S PARTY ID>"   # must match the app's Network ID
  bootstrapNodes: []
profile: storage            # always-on; stores strand data while the phone is offline
strandFilter: all           # replicate every strand the phone publishes
storage:
  type: file
  path: ./data/health
network:
  listenAddrs:
    - "/ip4/0.0.0.0/tcp/4001"        # LAN peers
    - "/ip4/0.0.0.0/tcp/4002/ws"     # WebSocket — REQUIRED for the RN phone (no raw TCP)
  enableRelay: true                  # relay for a NAT'd phone
hibernation:
  enabled: false
```

### 2. Start the drone, pinning the phone's owner key

A cold node **rejects** a seed unless its signer (the phone's owner key) is pinned as a
trust anchor. Start it listening for seeds, with that key pinned:

```bash
# From the app: Sereus Connections → My Nodes (+) → "Show this device's owner key"
cadre start -c cadre.yaml --listen-for-seeds --pin-owner-key <phone-owner-key>
# (equivalently: CADRE_OWNER_KEYS=<phone-owner-key> cadre start -c cadre.yaml --listen-for-seeds)
```

**Do not use `--owner`.** It makes the node found its own cadre instead of joining
yours. Note the drone's **Peer ID** printed on startup.

### 3. Add the node from the phone

In **Sereus Connections → My Nodes (+)**, enter the node's address and tap **Connect**.
The phone **authorizes** the node (`addDrone`), **delivers its seed** over the network
(`deliverSeed`, which needs `--listen-for-seeds`), then dials it. The result shows
on screen:

- *Node added*: the seed was accepted. The node row shows **Connected** or
  **Not connected** live.
- Otherwise you get the **reason**, plus the seed to apply by hand on the node
  (`cadre start -c cadre.yaml --seed <seed>`). The node is already authorized.

Which address form to use depends on the build:

| Build | Address |
|---|---|
| Any build, node with a hostname (`uranus.batemans.org`, `kjeib.com`) | `/dns4/<host>/tcp/<port>/wss/p2p/<peerId>` (TLS in front of the node's `/ws` listener) |
| **Android debug** only, LAN | `/ip4/<lan-ip>/tcp/4002/ws/p2p/<peerId>` |
| Emulator → node on this Mac | `/ip4/10.0.2.2/tcp/4002/ws/p2p/<peerId>` (Android debug) |

Android **release** builds disable cleartext traffic for every host, so plain
`ws://` fails there even on the LAN. iOS allows `ws://` to local addresses
(`NSAllowsLocalNetworking`) but not to public hostnames. The address must end in
`/p2p/<peerId>`.

For a log capture of a pairing attempt, uncomment the DEBUG line in
`apps/mobile/src/debug-bootstrap.js`, rebuild, and watch
`adb logcat -v time | grep ReactNativeJS`. The app logs one summary line per attempt:
`[CadreService] [pairing] node=… authorized=true delivered=… reason=… controlConnections=…`.

The phone dials the drone, (re)publishes the health strand, and the drone
(member, `strandFilter: all`) discovers and replicates it.

### 4. Verify replication

- Add or edit a health entry on the phone.
- Confirm rows land under `./data/health` on the drone (it persists the strand),
  or query the drone's admin API (`GET /admin/strands`, loopback + Bearer
  `CADRE_STARTUP_TOKEN`).

---

## Option B — cadre-host

`@serfab/cadre-host` is a Linux management plane that runs cadre nodes as child
processes (systemd-user/launchd). Two roles:

- **Donor** (default): spawns a node that joins **your** cadre. Install, then
  `POST /grants { partyId, bootstrapNodes, ownerKeys }` (loopback/LAN in v1) with
  the phone's Party ID + owner key; `GET /grants/:id/peer` returns the node's
  `{ peerId, multiaddrs }` to enter in the app's Connect field. The app's
  **Add Cloud/Drone** seed is delivered via `PUT /grants/:id/seed`.
- **Founder** (`cadre-host install --own-cadre`): also runs the host's own cadre;
  `cadre-host invite "phone"` mints a `CadreInvite` the phone would redeem
  (in-app redemption is not yet wired — see STATUS.md).

Setup + API details: `sereus/docs/cadre-host.md`. From the app's side the flow is
identical to Option A: enter the node's bootstrap multiaddr and Connect, after the
node has been told to trust this device's owner key.

---

## Troubleshooting

- **"Address must end in /p2p/<peerId>"** — append `/p2p/<drone-peer-id>`.
- **Phone connects but nothing replicates**: check the pairing result. If the seed wasn't
  delivered, the node isn't in the cadre yet (apply the shown seed). Also check the node was
  started with `--pin-owner-key <phone key>` (not `--owner`) and that Party IDs match. Confirm
  by reading rows back **on the node**: an unresolvable-cohort write still reports success
  (optimystic#19).
- **Can't dial from an Android emulator** — use `adb reverse` (above); the
  emulator can't reach the host's LAN IP directly.
- **iOS build** — after this upgrade added `react-native-webrtc`, run
  `cd ios && bundle exec pod install` before building.
