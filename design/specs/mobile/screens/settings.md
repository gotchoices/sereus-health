# Settings Screen Spec

## Purpose

Provide a simple, stable entry point for app-wide configuration and data management.

## Layout

- Header: title “Settings”
- Content: list of sections (rows)
- Bottom tabs: pinned at bottom (per global navigation layout)

## Sections (order)

### Preferences (inline; no sub-screen initially)

If there are only a small number of preferences (≈1–3), they should be shown directly on the Settings screen rather than behind a separate “Preferences” screen.

Initial preferences:

- **Theme**: `System | Light | Dark` (see `design/specs/mobile/global/ui.md`)

### Reminders

- Row navigates to `Reminders`

### Sereus Connections

- Row navigates to `SereusConnections`

### Backup & Restore

- Row navigates to `BackupRestore`

### About

- App version, build number
- Short, hyperlinked blurbs about
  GotChoices.org
  Sereus.org
  MyCHIPs.org

## Debug (dev-only)
- Normally routes to a stub: Not implemented
- Used ephemerally to test/debug various features
