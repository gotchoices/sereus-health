# Sereus Cadre Integration Checklist

## RN Compatibility

- [ ] Verify `@sereus/cadre-core` loads in RN
- [ ] Verify `@optimystic/db-p2p` works (may need polyfills)
- [ ] Shim Node.js imports (`fs/promises`, `path`) in `control-database.ts`

## Phase 1: Core Integration

- [ ] Install `@sereus/cadre-core`
- [ ] Create `CadreService` singleton (init, start, stop, persist config)

## Phase 2: Key Management

- [ ] Implement "Add Key" flow (local vault / external)
- [ ] Local vault: Keychain/Keystore storage
- [ ] External: export as JWK file or QR

## Phase 3: Add Node

- [ ] Implement `authorizePeer()` → `createSeed()` → deliver via provider API
- [ ] Phone dials drone after seed delivery
- [ ] Implement "Server adds Phone" flow (scan QR, dial server)

## Phase 4: Invite Guest (Strand-level)

- [ ] Integrate with `FormationInvite` / `StrandSolicitationService`
- [ ] UI for creating/sharing invitations
- [ ] UI for accepting incoming strand invitations

## Phase 5: Wire UI

- [ ] Replace `getSereusConnections()` mock with real queries
- [ ] Query `CadrePeer` table for My Nodes
- [ ] Implement DHT status probe
- [ ] Wire remove/revoke actions
