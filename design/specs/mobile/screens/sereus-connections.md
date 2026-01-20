# SereusConnections Screen Spec

## Purpose

View and manage the user's [Sereus](https://sereus.org) network: keys, nodes, and strand guests.

## Layout

- Header: title "Sereus Connections"
- Content sections:

### Network ID

- Displays the user's private network identifier
- Tap-to-copy action

### My Keys

Authority keys that can authorize changes to the network.

- **(+)** button to add a new key (see Key Management below)
- List of keys, each showing:
  - **Icon**: key type (vault / dongle / external)
  - **Type**: vault, dongle, or external
  - **Protection**: login / password / biometric
  - **Key**: public key (abbreviated; expandable to full)

### My Nodes

Devices in the user's cadre that store/sync data.

- **(+)** button to add a new node (disabled until at least one key exists)
- List of nodes, each showing:
  - **Icon**: device type (phone / server / desktop / other)
  - **Name**: user-friendly label
  - **Status**: Online / Unknown / Unreachable
  - **Identifier**: Peer ID (abbreviated; tap to copy)
  - **Trash**: remove node from the cadre

### Strand Guests

Trusted third parties (doctors, friends) who can access specific strands.

- **(+)** button to invite a guest (disabled until at least one key exists)
- List of guests, each showing:
  - **Icon**: guest icon
  - **Name**: provider, doctor, friend, etc.
  - **Status**: Online / Unknown / Unreachable
  - **Identifier**: Member ID (cadre-level)
  - **Trash**: revoke guest access

---

## Initialization (First Run)

On first launch:

1. App initializes the cadre management schema (control database).
2. No keys exist yet → My Keys list is empty.
3. **(+)** buttons for My Nodes and Strand Guests are **disabled** until at least one key is created.

---

## Key Management
At least one key must be created before more nodes, guests can be added.  When adding a new key, the user selects:
- Local vault (default unless at least one local vault key already exists)
- External (default if local key exists)
- Dongle (future implementation)

When choosing local vault, the user needs to choose whether to protect the key with biometrics or to have it accessible automatically any time the phone is unlocked (login).

When choosing external, a key is created, then:
- the user is prompted for a passcode to protect it (empty means no protection)
- the private key can be shared as:
  - a file stored to the device' file system
  - a QR code printed, emailed, texted

## Connectivity
Each time the screen is entered, the interface will probe down to the Fret (DHT) level to determine if a peer ID is currently connected, unknown or disconnected.  There is no API at the Sereus level for this status.
