# STATUS (mobile)

This checklist tracks spec review work for the **mobile** target. Treat it as the "what to validate next" list when stories shift.

## Current refactor focus

- **AI assistant** becomes the "universal adapter" for foreign inputs (spreadsheets, arbitrary files, images).
- App accepts only a **canonical import structure** (YAML and/or JSON) for direct import.
- First-run should support an **empty database** (no seed rows), with onboarding to import "popular catalogs" from `health.sereus.org`.

## Specs to review/update (checklist)

### Domain contract (shared)

- [x] `design/specs/domain/import-export.md` — align with canonical YAML/JSON only; move "foreign formats" to assistant-mediated flow; confirm idempotency rules and identity keys for all entities.
- [x] `design/specs/domain/rules.md` — remove "first-run seed expectations"; add empty-first-run + onboarding expectations.
- [x] `design/specs/domain/logging.md` — confirm log-entry export/import contract remains consistent (CSV export for analysis is OK; import should be canonical only).
- [x] `design/specs/domain/taxonomy.md` — confirm terminology (Type/Category/Item/Bundle) matches story language and UI wording.
  - [x] **No CSV import in specs**: confirmed there is **no direct CSV import** path described anywhere in specs; foreign formats must be assistant-mediated into canonical YAML/JSON before preview/approval.

### Mobile global + navigation

- [x] `design/specs/mobile/navigation.md` — add/confirm routes for: GettingStarted/Onboarding, Assistant (config + chat), Import flows entrypoints.
- [x] `design/specs/mobile/global/general.md` — add guidance for empty states and onboarding entrypoints.
- [x] `design/specs/mobile/global/ui.md` — confirm empty-state patterns (CTA to import starter catalog, CTA to create first Type/Category).

### Mobile screens (UX contracts)

- [x] `design/specs/mobile/screens/log-history.md` — empty DB behavior: no log entries; prominent "Get started" CTA.
- [x] `design/specs/mobile/screens/edit-entry.md` and `design/specs/mobile/screens/edit-entry-wizard.md` — behavior when there are **no Types/Categories/Items** yet.
- [x] `design/specs/mobile/screens/configure-catalog.md` — first-run catalog creation path (create first Type/Category/Item) and/or "popular imports" entry.
- [x] `design/specs/mobile/screens/backup-restore.md` — clear local data should yield truly empty DB (no reseed); import/export canonical formats; preview-before-commit.
- [x] `design/specs/mobile/screens/settings.md` — links/entrypoints for Assistant config + GettingStarted + Backup & Import.
- [x] `design/specs/mobile/screens/sereus-connections.md` — verify how networking interacts with schema versioning + import/export.

### Mobile components (if needed)

- [x] `design/specs/mobile/components/index.md` — add component-level contracts for: empty-state panel, "import starter catalog" CTA, assistant action preview list.

## Non-spec checklist (things to consider during refactor)

- [x] **Story ordering/numbering**: decide whether assistant/import/export/backups should be earlier/later in the numbered story sequence.
- [x] **Seed removal migration**: decide how existing installs behave after removing seeds (do we wipe? do we keep old seed rows?).
- [ ] **Hosted starter catalogs**: define `health.sereus.org` starter catalog URLs, versioning, and compatibility guarantees.
- [x] **Security/privacy**: define where AI API keys are stored (device keychain/secure store), redaction rules, and user consent when uploading files/images.
  - [x] API key storage location: stored in device secure storage (Keychain/Keystore) — see `design/specs/mobile/screens/api-keys.md` and `design/specs/mobile/global/assistant/vercel-ai-sdk.md`.
- [ ] **Offline behavior**: assistant unavailable offline; ensure canonical import still works offline.
- [ ] **Test matrix**: empty DB flows, import idempotency, clear+import replace, assistant preview/approval, export CSV readability, export YAML/JSON re-import.

## Sereus / Optimystic Integration

### Stack upgrade — 0.12 wave (2026-09-02)

Upgraded from the 0.10 stack to the published **0.12** release so health can test a
Linux cadre node: `@serfab/cadre-core` 0.10→**0.12**, `@optimystic/*` 0.22→**0.27**,
`@quereus/*` 4.11→**4.18**, `p2p-fret` 0.6→**1.0.0-beta.4**. Removed `@serfab/strand-proto`
(deleted upstream — formation is now native in cadre-core), the two directly-declared
`@optimystic/quereus-plugin-*` deps (now composed inside cadre-core; kept in `resolutions`
to force one version), and `fast-text-encoding` (Hermes has native `TextEncoder`). Added
`@libp2p/websockets` + `@libp2p/circuit-relay-v2` + `@libp2p/webrtc` + `react-native-webrtc`
+ `@multiformats/multiaddr`, and pinned libp2p to the 0.12-tested versions
(`@libp2p/interface` 3.3.0, `libp2p` 3.3.11, `@libp2p/peer-id` 6.0.15, `@multiformats/multiaddr`
13.0.3, `@libp2p/peer-collections` 7.0.28, `@noble/hashes` 2.4.0 — the last two added to
`resolutions` to collapse duplicate copies that broke `dial()`/transport types).

Key API changes absorbed in `CadreService.ts`:
- **`StrandConfig.mode` ('bootstrap'|'networked') is GONE.** Solo/local commit is automatic;
  a strand no longer needs a teardown+re-add to "go networked". We found once with
  `founder: true` (gated on `@sereus/healthStrandFounded`), then re-open with `founder: false`.
- **`publishStrand(id, 'o')`** registers the strand in the control DB so a joining Linux node
  discovers + replicates it (done once on the founder path; re-attempted on connect).
- New node-local seams wired: `trustedOwners` + `bootstrapPeers` persistent stores (LevelDB
  `optimystic-node-local`) and `hibernation:{enabled:false}`.
- Transports now `[webSockets(), circuitRelayTransport(), webRTC()]` so a NAT'd phone can dial
  a relay-enabled drone and upgrade to a direct path. `metro.config.js` forces the Hermes-safe
  `browser` variants of `@libp2p/crypto` + `@libp2p/webrtc`; `index.js` calls
  `react-native-webrtc`'s `registerGlobals()`.

**Data wipe on upgrade:** pre-1.0 has no schema/data migration and 0.22→0.27 changed the
optimystic substrate. Existing installs must export → upgrade → Clear local data → re-import.

> **TODO — move identity + trust anchor into react-native-keychain (KeyStore seam).**
> Identity is still injected as `config.privateKey` (loaded from the control LevelDB via
> `loadOrCreateRNPeerKey`), and the trusted-owner anchor is plaintext LevelDB. The reference
> app uses cadre-core's `KeyStore` seam over a secure enclave (`SecureStoreKeyStore`) plus a
> secure-store-backed `PersistentTrustedOwnerStore`, so the identity key and the trust anchor
> it qualifies share one fate. Migrate both to `react-native-keychain` (already a dependency);
> handle existing installs (no persisted keychain identity → cold-start once). See the header
> comment in `src/services/CadreService.ts`.

### Connect to a Linux cadre node (Step 3, partial — 2026-09-02)

Minimal drone-connect landed: **Sereus Connections → My Nodes (+)** opens a modal to enter a
node's bootstrap multiaddr (`cadreService.connectToNode`), which persists it
(`@sereus/bootstrapNodes`, applied as `controlNetwork.bootstrapNodes` on next start) and
live-dials it. The modal also exposes this device's **owner public key** (for the node's
out-of-band trust config) and the existing drone-seed path. See `docs/cadre-node-testing.md`
for how to stand up a cadre-cli drone or cadre-host and run an end-to-end replication test.
Still open: applying a drone-emitted seed in-app, relay reservation for phone reachability
(needed for guest invitations), and status probing.

### RN Compatibility (bundling)

- [x] `@serfab/cadre-core` loads in RN (Metro resolves)
- [x] `@optimystic/db-p2p` resolves (`react-native` export condition → `rn.js`, no TCP)
- [x] Node.js built-in shims for libp2p transitive deps (`os`, `net`, `tls`)
- [x] `@babel/runtime` ESM/CJS interop (`resolveRequest` forces CJS helpers)
- [x] `CadreService` singleton created (`src/services/CadreService.ts`)

### Known Quereus workarounds

- [x] **Scanning `DELETE ... WHERE <fk> = ?` tree-mutation bug** — **RESOLVED in Quereus 4.3.1**
  (upgraded 2026-07-08; the fix also closed the GROUP-BY duplicate-`id`-symbol bug). Reverted the
  drain-then-point-delete workarounds back to plain predicate `DELETE` in `updateLogEntry` +
  `deleteLogEntry` (`src/db/logEntries.ts`), and **verified end-to-end** by editing a log entry's time
  on the emulator (the exact flow that used to throw "Path is invalid due to mutation of the tree").
  Note: `upsertItem` (`src/db/catalog.ts`) uses point-delete-by-PK *reconciliation* (retire/update/insert),
  not a scanning-delete workaround — left as-is; `getItemsForType` (`src/db/stats.ts`) keeps its
  scalar-subquery form (clean, no revert needed). See `docs/quereus-rn-issues.md` §6.

### Step 1: Local-only node (app "just works")

CadreNode starts at app startup with auto-generated party ID.  Health data
is stored in a local optimystic strand via `addStrand()`.

**No authority key required for local storage.** `addStrand()` starts a strand
locally without writing to the control database.  Authority keys, CadrePeer
registration, and control-DB strand entries are deferred until Step 3
(adding a second node).

- [ ] `cadreService.start()` at app startup — fix runtime errors from `createLibp2pNode()`, `ControlDatabase.initialize()`
- [ ] Auto-generate party ID (UUID, persisted in AsyncStorage)
- [x] `addStrand()` with health sApp config (schema, sAppId) — creates strand libp2p node + StrandDatabase.  Strand is added with `mode: 'bootstrap'` so schema apply + DML route through the optimystic LOCAL transactor (no peers required).  Step 3 will need to restart the strand in `'networked'` mode when the first remote node is added (`StrandMode` is fixed per StrandDatabase instance).
- [ ] Health data reads/writes go through `StrandDatabase.getDatabase()` (Quereus + optimystic plugin)
- [x] Add `@optimystic/db-p2p-storage-rn` (v0.14, LevelDB-backed) — persistent storage via `LevelDBRawStorage` on top of the same `rn-leveldb` native module Quereus already uses
- [ ] Keep `rn-leveldb` (shared native module across both backends; `@quereus/plugin-react-native-leveldb` is now only used by Mode B in `db/config.ts`)
- [ ] Verify data persists across cold restarts (the host-app verification step called out in sereus ticket `wire-strand-storage-into-bootstrap-transactor`; look for `persistentStorage=true` in the strand-db init log to confirm wiring before re-running)
- [x] Persist node identity (Ed25519 private key → `optimystic-control` LevelDB via `loadOrCreateRNPeerKey` → reload via `config.privateKey`).  Secure-storage upgrade still pending (LevelDB on RN is sandboxed but not Keychain-grade).

### Step 2: Sereus Connections screen

Displays real party ID and this device's Peer ID.  My Keys is empty (no
authority key yet).  Add-node and invite-guest buttons disabled.

- [ ] Party ID: show full width (`numberOfLines={1}` with tail ellipsis), tap to copy
- [ ] This device: first node in My Nodes, status Online, Peer ID tap to copy
- [ ] My Keys: empty — guidance to add a key when ready for networking
- [ ] (+) for remote nodes and guests disabled until a key exists

### Step 3: Add public-IP drone node

First time the user adds a remote node, auto-create the authority key and
register everything in the control database.  This is also when the health
strand must be torn down and re-added in `mode: 'networked'` so the
optimystic plugin starts routing through the network transactor instead of
the bootstrap-local transactor.  `CadreService.ts` currently hard-codes
`'bootstrap'`; add a mode argument (or implicit transition based on
"first peer added") when wiring this step.

**First-time networking setup (triggered by "Add Node"):**

- [ ] Generate Ed25519 authority keypair; store private key in secure storage
- [ ] `ControlDatabase.insertAuthorityKey()` — bootstrap insert (no prior auth needed)
- [ ] `ControlDatabase.insertStrand()` — register health strand in control DB (signed)
- [ ] Insert this device into `CadrePeer` (signed)

**Enrollment:**

- [ ] `initializeSeedBootstrap(authorityPrivateKey)` → `createSeed()` → deliver via provider API → `deliverSeed(targetMultiaddr)`
- [ ] Drone appears in My Nodes from `CadrePeer` query
- [ ] Health data replicates (drone discovers strand from control DB)

### Step 4: Add private-IP drone node

Requires relay support (both phone and drone behind NAT).

- [ ] Blocked on upstream: phone→phone enrollment via `getRelayAddress()` + relay-routed multiaddr
- [ ] When available: create seed with relay address, deliver out-of-band

### Step 5: Strand guests

- [ ] `createOpenInvitation(sAppId)` → share via QR/link
- [ ] Accept incoming → `formStrand()`
- [ ] Guest appears in Strand Guests section

### Step 6: Status probing

- [ ] Probe Fret (DHT) on screen entry → Online / Unknown / Unreachable
