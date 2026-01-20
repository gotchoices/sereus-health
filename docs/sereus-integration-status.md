# Sereus Cadre Integration Status

> Tracks unresolved questions and remaining tasks for integrating `@sereus/cadre-core` into Sereus Health.

---

## Unresolved Spec Questions

| Topic | Question | Notes |
|-------|----------|-------|
| **Add Node Flow** | What is the QR payload format for adding a new node? | Needs: partyId, bootstrapNodes, authorityKey? |
| **Signature Exchange** | How does the authority signature reach the new device? | Option A: authority registers directly. Option B: signature returned via QR/link. |
| **Storage Path** | Where does the control database persist on mobile? | Needs path + secure storage considerations |

---

## RN Compatibility Check

Before implementation, verify these packages work in React Native:

| Package | Concern | Status |
|---------|---------|--------|
| `@sereus/cadre-core` | Entry point | ❓ |
| `@optimystic/db-p2p` | libp2p networking; may need polyfills | ❓ |
| `control-database.ts` | Uses `fs/promises`, `path` (Node.js only) | ⚠️ Needs RN shim |

---

## Implementation Tasks

### Phase 1: Core Integration

- [ ] Shim or replace Node.js imports in `control-database.ts` for RN
- [ ] Install `@sereus/cadre-core` and verify it loads
- [ ] Create `CadreService` singleton:
  - `initCadre()` – first-run: create schema, no keys yet
  - `startNode()` – start CadreNode with stored config
  - `stopNode()` – graceful shutdown
  - Persist config in secure storage (partyId, privateKey, bootstrapNodes)

### Phase 2: Key Management

- [ ] Implement "Add Key" flow (local vault / external)
- [ ] Store keys in Keychain/Keystore (local vault)
- [ ] Export key as file or QR (external)

### Phase 3: Add Node

- [ ] Define QR payload schema
- [ ] Implement "Show add-device QR" screen
- [ ] Integrate QR scanner (e.g., `react-native-vision-camera`)
- [ ] Implement enrollment: `createCadrePeer()` → sign → `registerCadrePeer()`

### Phase 4: Wire UI

- [ ] Replace `getSereusConnections()` mock with real cadre queries
- [ ] Query `CadrePeer` table for My Nodes list
- [ ] Implement status detection via DHT probe
- [ ] Wire remove/revoke actions to real operations

---

## Configuration Notes

Mobile `CadreNodeConfig` should use:

```ts
{
  profile: 'transaction',  // Ring Zulu only, no archival storage
  strandFilter: { mode: 'sAppId', sAppId: 'org.sereus.health' },
  hibernation: { enabled: true, defaultLatencyHint: 'interactive' },
}
```
