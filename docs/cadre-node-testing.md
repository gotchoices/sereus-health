# Testing a Linux cadre node with Sereus Health

This describes how to connect the Health app (a phone node) to an always-on
**Linux cadre node** so health data replicates off-device, using the cadre-core
**0.12** stack. Two ways to run the Linux node are covered:

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

### 2. Start the drone, trusting + enrolling the phone

A cold node **rejects** a seed unless the seed's signer (the phone's owner key)
is pinned as a trust anchor. Pin it with `CADRE_OWNER_KEYS`, and enroll the
phone's seed at start:

```bash
cd sereus/packages/cadre-cli

# From the app: Sereus Connections → My Nodes (+) → "Show this device's owner key"
export CADRE_OWNER_KEYS="<phone-owner-key-base64url>"

# From the app: My Nodes (+) → "Add Cloud/Drone" → copy the seed
npx cadre start -c /path/to/drone.cadre.yaml --seed "<phone-seed-base64url>" --listen-for-seeds
```

Note the drone's **Peer ID** printed on startup. (`--listen-for-seeds` also lets
the drone accept a seed delivered over the network later; the exact seed flags
are documented in `sereus/packages/cadre-cli/README.md` — check it if your
cadre-cli version differs.)

### 3. Connect the phone

In **Sereus Connections → My Nodes (+)**, enter the drone's bootstrap multiaddr
and tap **Connect**:

```
/ip4/<drone-lan-ip>/tcp/4002/ws/p2p/<drone-peer-id>
```

- Use the drone's **LAN IP** (e.g. `192.168.1.50`) when phone + drone share a
  network. For an emulator reaching a drone on the same Mac, `adb reverse
  tcp:4002 tcp:4002` and dial `/ip4/127.0.0.1/tcp/4002/ws/p2p/<peer-id>`.
- The address **must** end in `/p2p/<peer-id>`.

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
- **Phone connects but nothing replicates** — the drone doesn't trust the phone
  (owner key not in `CADRE_OWNER_KEYS`) or wasn't enrolled (no `--seed`), or the
  Party IDs differ. All three must line up.
- **Can't dial from an Android emulator** — use `adb reverse` (above); the
  emulator can't reach the host's LAN IP directly.
- **iOS build** — after this upgrade added `react-native-webrtc`, run
  `cd ios && bundle exec pod install` before building.
