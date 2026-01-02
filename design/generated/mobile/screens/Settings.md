---
provides:
  - screen:mobile:Settings
needs:
  - screen:mobile:SereusConnections
  - screen:mobile:Reminders
  - screen:mobile:BackupRestore
dependsOn:
  - design/stories/mobile/07-networking.md
  - design/stories/mobile/08-reminders.md
  - design/stories/mobile/09-backup.md
  - design/specs/mobile/screens/settings.md
  - design/specs/mobile/navigation.md
  - design/specs/mobile/global/general.md
  - design/specs/mobile/global/ui.md
---

# Settings Screen Consolidation

## Purpose

Root of the SETTINGS tab. Provides a stable entry point for app-wide configuration and data management through a simple list of sections (rows).

## Screen Identity

- **Route**: `Settings` (SETTINGS tab root)
- **Title**: "Settings"
- **Deep Link**: `health://screen/Settings?variant={happy|empty|error}`

## User Journey Context

From stories:
- **07-networking.md**: Bob navigates to Settings to access Sereus Connections and configure his cadre.
- **08-reminders.md**: Bob navigates to Settings to configure reminder notifications.
- **09-backup.md**: Bob navigates to Settings to export/import backups before switching phones or for data portability.

## Layout & Information Architecture

### Header
- **Title**: "Settings" (centered or left-aligned per platform conventions)

### Main Content Area

A scrollable list of setting sections (rows), each navigating to a dedicated screen:

1. **Theme** (inline, no sub-screen initially)
   - If only a small number of preferences (≈1–3), show directly on Settings rather than a separate "Preferences" screen
   - Initial inline option: Theme selector (`System | Light | Dark`)
   - Future: May move to a "Preferences" sub-screen if the list grows

2. **Reminders**
   - Row navigates to `Reminders` screen
   - Icon: `notifications-outline`

3. **Sereus Connections**
   - Row navigates to `SereusConnections` screen
   - Icon: `cloud-outline`

4. **Backup & Restore**
   - Row navigates to `BackupRestore` screen
   - Icon: `save-outline`

5. **About**
   - Row navigates to (future) `About` screen or inline display
   - Shows: app version, build number, short hyperlinked blurbs about GotChoices.org, Sereus.org, MyCHIPs.org
   - Icon: `information-circle-outline`

6. **Debug (dev-only)** (`__DEV__` gated)
   - Row normally routes to a stub: "Not implemented"
   - Used ephemerally to test/debug various features
   - Icon: `bug-outline`

### Bottom Navigation (Tab Bar)
- **Home Tab**: Access to LogHistory
- **Catalog Tab**: Access to ConfigureCatalog
- **Settings Tab** (current, highlighted)
- Per `general.md`: bottom tab bar is visually pinned to the bottom; content area scrolls above it

## Navigation

- **Push to**:
  - `Reminders` (via row tap)
  - `SereusConnections` (via row tap)
  - `BackupRestore` (via row tap)
- **No back action**: Settings is a tab root (no "back")

## Data Shaping Notes

Settings screen is mostly static navigation:
- No entity CRUD on this screen
- Theme preference (if inline) reads/writes app config (not schema entities)
- "About" section may read app metadata (version, build)

## Required i18n Keys

- `settings.title` — "Settings"
- `settings.theme` — "Theme"
- `settings.reminders` — "Reminders"
- `settings.sereusConnections` — "Sereus Connections"
- `settings.backupRestore` — "Backup & Restore"
- `settings.about` — "About"
- `settings.debug` — "Debug (dev)"
- `common.notImplementedTitle` — "Not Implemented"
- `common.notImplementedBody` — "This feature is coming soon."

## UI Notes

- Each row is a tappable card with:
  - Icon (left)
  - Label text (center-left)
  - Chevron-right indicator (right edge)
- Rows use consistent spacing per theme (e.g., `spacing[3]` gap)
- Dev-only rows (`__DEV__` gated) are visually distinct (e.g., faded or different border)

## Variants (mock data)

- **happy** (default): All navigation rows functional
- **empty**: Same (no entity data involved)
- **error**: Same (no data fetching errors possible)
