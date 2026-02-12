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

### RN Compatibility (bundling)

- [x] `@sereus/cadre-core` loads in RN (Metro resolves)
- [x] `@optimystic/db-p2p` resolves (`react-native` export condition → `rn.js`, no TCP)
- [x] Node.js built-in shims for libp2p transitive deps (`os`, `net`, `tls`)
- [x] `@babel/runtime` ESM/CJS interop (`resolveRequest` forces CJS helpers)
- [x] `CadreService` singleton created (`src/services/CadreService.ts`)

### Step 1: Local-only node (app "just works")

CadreNode starts at app startup with auto-generated party ID.  Health data
is stored in a local optimystic strand via `addStrand()`.

**No authority key required for local storage.** `addStrand()` starts a strand
locally without writing to the control database.  Authority keys, CadrePeer
registration, and control-DB strand entries are deferred until Step 3
(adding a second node).

- [ ] `cadreService.start()` at app startup — fix runtime errors from `createLibp2pNode()`, `ControlDatabase.initialize()`
- [ ] Auto-generate party ID (UUID, persisted in AsyncStorage)
- [ ] `addStrand()` with health sApp config (schema, sAppId) — creates strand libp2p node + StrandDatabase
- [ ] Health data reads/writes go through `StrandDatabase.getDatabase()` (Quereus + optimystic plugin)
- [ ] Add `@optimystic/db-p2p-storage-rn` + `react-native-mmkv` — persistent storage via `MMKVRawStorage`
- [ ] Remove `rn-leveldb` / `@quereus/plugin-react-native-leveldb` dependency
- [ ] Verify data persists across cold restarts
- [ ] Persist node identity (Ed25519 private key → secure storage → reload via `config.privateKey`)

### Step 2: Sereus Connections screen

Displays real party ID and this device's Peer ID.  My Keys is empty (no
authority key yet).  Add-node and invite-guest buttons disabled.

- [ ] Party ID: show full width (`numberOfLines={1}` with tail ellipsis), tap to copy
- [ ] This device: first node in My Nodes, status Online, Peer ID tap to copy
- [ ] My Keys: empty — guidance to add a key when ready for networking
- [ ] (+) for remote nodes and guests disabled until a key exists

### Step 3: Add public-IP drone node

First time the user adds a remote node, auto-create the authority key and
register everything in the control database.

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
