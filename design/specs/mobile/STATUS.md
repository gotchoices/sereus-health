# STATUS (mobile)

This checklist tracks spec review work for the **mobile** target. Treat it as the “what to validate next” list when stories shift.

## Current refactor focus

- **AI assistant** becomes the “universal adapter” for foreign inputs (spreadsheets, arbitrary files, images).
- App accepts only a **canonical import structure** (YAML and/or JSON) for direct import.
- First-run should support an **empty database** (no seed rows), with onboarding to import “popular catalogs” from `health.sereus.org`.

## Specs to review/update (checklist)

### Domain contract (shared)

- [x] `design/specs/domain/import-export.md` — align with canonical YAML/JSON only; move “foreign formats” to assistant-mediated flow; confirm idempotency rules and identity keys for all entities.
- [x] `design/specs/domain/rules.md` — remove “first-run seed expectations”; add empty-first-run + onboarding expectations.
- [x] `design/specs/domain/logging.md` — confirm log-entry export/import contract remains consistent (CSV export for analysis is OK; import should be canonical only).
- [x] `design/specs/domain/taxonomy.md` — confirm terminology (Type/Category/Item/Bundle) matches story language and UI wording.
  - [x] **No CSV import in specs**: confirmed there is **no direct CSV import** path described anywhere in specs; foreign formats must be assistant-mediated into canonical YAML/JSON before preview/approval.

### Mobile global + navigation

- [x] `design/specs/mobile/navigation.md` — add/confirm routes for: GettingStarted/Onboarding, Assistant (config + chat), Import flows entrypoints.
- [x] `design/specs/mobile/global/general.md` — add guidance for empty states and onboarding entrypoints.
- [x] `design/specs/mobile/global/ui.md` — confirm empty-state patterns (CTA to import starter catalog, CTA to create first Type/Category).

### Mobile screens (UX contracts)

- [x] `design/specs/mobile/screens/log-history.md` — empty DB behavior: no log entries; prominent “Get started” CTA.
- [x] `design/specs/mobile/screens/edit-entry.md` and `design/specs/mobile/screens/edit-entry-wizard.md` — behavior when there are **no Types/Categories/Items** yet.
- [x] `design/specs/mobile/screens/configure-catalog.md` — first-run catalog creation path (create first Type/Category/Item) and/or “popular imports” entry.
- [x] `design/specs/mobile/screens/backup-restore.md` — clear local data should yield truly empty DB (no reseed); import/export canonical formats; preview-before-commit.
- [x] `design/specs/mobile/screens/settings.md` — links/entrypoints for Assistant config + GettingStarted + Backup & Import.
- [x] `design/specs/mobile/screens/sereus-connections.md` — verify how networking interacts with schema versioning + import/export.

### Mobile components (if needed)

- [x] `design/specs/mobile/components/index.md` — add component-level contracts for: empty-state panel, “import starter catalog” CTA, assistant action preview list.

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

### Step 1: CadreNode boots at app startup

CadreNode is the storage backend — it must start before health data can be
read or written. Auto-bootstrap: generate party ID, create authority key,
register this device, create health strand.

- [ ] Move `cadreService.start()` to app startup (not lazy on Sereus Connections screen)
- [ ] Fix runtime errors from `createLibp2pNode()` and `ControlDatabase.initialize()`
- [ ] Confirm `control:connected` event fires
- [ ] Auto-bootstrap: party ID → authority key → self-register in CadrePeer → create health strand

### Step 2: Migrate health data to optimystic

Replace `@quereus/plugin-react-native-leveldb` with optimystic strand storage.
Health schema applied to the strand's Quereus database.

- [ ] Add `@optimystic/db-p2p-storage-rn` + `react-native-mmkv` dependencies
- [ ] Health data reads/writes go through strand database (not leveldb)
- [ ] Remove `rn-leveldb` dependency
- [ ] Verify data persists across cold restarts (MMKVRawStorage)

### Step 3: Persist node identity

- [ ] Save Ed25519 private key to secure storage (Keychain/Keystore) after first start
- [ ] Reload via `config.privateKey` on subsequent starts → stable Peer ID
- [ ] Upstream: `createLibp2pNode` may need a patch to accept `privateKey`

### Step 4: Sereus Connections screen

Party ID, this device, and bootstrap authority key already exist from
auto-bootstrap. Screen displays real data from control database.

- [ ] Party ID: show full width (`numberOfLines={1}` with tail ellipsis), tap to copy
- [ ] This device: first node, status Online, Peer ID tap to copy
- [ ] My Keys: bootstrap key displayed
- [ ] Add Key flow (local vault / external)

### Step 5: Node enrollment

- [ ] **Phone adds Drone**: `createSeed()` → provider API → `deliverSeed()`
- [ ] **Server adds Phone**: scan QR → `dialInvite()`
- [ ] Enrolled nodes appear from `CadrePeer` query

### Step 6: Strand guests

- [ ] `createOpenInvitation(sAppId)` → share via QR/link
- [ ] Accept incoming → `formStrand()`

### Step 7: Status probing

- [ ] Probe Fret (DHT) on screen entry → Online / Unknown / Unreachable


