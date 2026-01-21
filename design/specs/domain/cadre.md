# Cadre Management

Apps rely on [@sereus/cadre-core](https://github.com/gotchoices/sereus.git) for cadre and strand management.

For architecture, enrollment flows, and API details, see `sereus/docs/cadre-architecture.md`.

## Core Concepts

- **Cadre**: A user's personal cluster of devices (phone, server, NAS, etc.)
- **Party ID**: Unique identifier for the user's network; generated on first run
- **Control Network**: Private database shared by the user's cadre nodes
- **Strand**: Shared data space with other parties
- **Strand Guests**: Trusted third parties with access to specific strands (strand-level, not cadre-level)

## Authority Keys

Keys authorize changes to the cadre (adding nodes, inviting guests).

### Key Types

- **Local vault**: stored in Keychain/Keystore
  - Protection: biometric or login (device-unlocked)
  - Lost if device is lost
- **External**: file or printout
  - Optional passcode protection
  - Exportable as JWK file or QR code
- **Dongle**: hardware signing device (future)

### Key Priority

When signing: search local vault first; if not found, prompt for external key (file or QR scan).

## Enrollment

- **Phone adds server**: phone creates invitation, sends to server, then dials out to connect
- **Server adds phone**: phone scans QR/link from server, dials server directly

The NAT'd device always dials out to the publicly-reachable device.
