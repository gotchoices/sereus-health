# Cadre Management

Apps rely on [@sereus/cadre-core](https://github.com/gotchoices/sereus.git) for cadre and strand management.

For full architecture, enrollment patterns, and API details, see `sereus/docs/cadre-architecture.md`.

## Core Concepts

- **Cadre**: A user's personal cluster of nodes (phone, server, NAS, etc.)
- **Party ID**: UUID identifying the user's control network; generated on first run
- **Control Network**: Private Optimystic database shared by the user's cadre nodes
- **Strand**: Shared data space with other parties (strand guests)

## Authority Keys

Keys authorize changes to the cadre (adding nodes, inviting guests).

### Key Types

- **Local vault**: Keychain/Keystore
  - Protection: biometric or login (device-unlocked)
  - Private key inaccessible; lost if device is lost
- **External**: file or printout
  - Optional passcode protection
  - Exportable as JWK file or QR code
- **Dongle**: hardware signing device (future)

### Key Priority

When signing: search local vault first; if no key found, prompt for external key (file or QR scan).

## Enrollment Patterns

| Scenario | Seed Needed? | Who Dials? |
|----------|--------------|------------|
| Phone (NAT) adds Drone (public) | Yes | Phone → Drone |
| Server (public) adds Phone (NAT) | No | Phone → Server |
| Phone (NAT) adds Phone (NAT) | Yes + relay | Both → Relay |

**Seed**: `ControlNetworkSeed` structure containing partyId, authorized peers, and optional multiaddrs.

- If instigator has public IP: seed includes multiaddrs, new node dials in
- If instigator is NAT'd: seed has no multiaddrs, instigator dials out after seed delivery

## Mobile Configuration

```ts
{
  profile: 'transaction',  // Ring Zulu only, no archival storage
  strandFilter: { mode: 'sAppId', sAppId: 'org.sereus.health' },
  hibernation: { enabled: true, defaultLatencyHint: 'interactive' },
}
```

## Strand Guests

Strand guests are strand-level members (via `FormationInvite`), not cadre peers. They are trusted third parties with access to specific strands.
