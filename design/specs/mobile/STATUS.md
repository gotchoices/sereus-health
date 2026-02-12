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

## Sereus Cadre Integration

### RN Compatibility

- [x] Verify `@sereus/cadre-core` loads in RN
- [x] Verify `@optimystic/db-p2p` resolves correctly (uses `react-native` export condition → `rn.js`, no TCP)
- [x] Shim remaining Node.js built-ins for libp2p transitive deps (`os`, `net`, `tls` — upstream `@libp2p/utils` and `@libp2p/websockets` lack proper `react-native` export conditions)
- [x] Fix `@babel/runtime` ESM/CJS interop (`resolveRequest` forces CJS helpers)

### Phase 1: Core Integration

- [x] Install `@sereus/cadre-core`
- [ ] Create `CadreService` singleton (init, start, stop, persist config)

### Phase 2: Key Management

- [ ] Implement "Add Key" flow (local vault / external)
- [ ] Local vault: Keychain/Keystore storage
- [ ] External: export as JWK file or QR

### Phase 3: Add Node

- [ ] Implement `authorizePeer()` → `createSeed()` → deliver via provider API
- [ ] Phone dials drone after seed delivery
- [ ] Implement "Server adds Phone" flow (scan QR, dial server)

### Phase 4: Invite Guest (Strand-level)

- [ ] Integrate with `FormationInvite` / `StrandSolicitationService`
- [ ] UI for creating/sharing invitations
- [ ] UI for accepting incoming strand invitations

### Phase 5: Wire UI

- [ ] Replace `getSereusConnections()` mock with real queries
- [ ] Query `CadrePeer` table for My Nodes
- [ ] Implement DHT status probe
- [ ] Wire remove/revoke actions


