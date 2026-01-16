---
provides:
  - screen:mobile:Settings
needs:
  - screen:mobile:SereusConnections
  - screen:mobile:Reminders
  - screen:mobile:BackupRestore
  - screen:mobile:ApiKeys
dependsOn:
  - design/stories/mobile/05-assistant.md
  - design/stories/mobile/08-reminders.md
  - design/stories/mobile/09-backup.md
  - design/stories/mobile/10-networking.md
  - design/specs/mobile/screens/settings.md
  - design/specs/mobile/screens/api-keys.md
  - design/specs/mobile/navigation.md
  - design/specs/mobile/global/general.md
  - design/specs/mobile/global/ui.md
---

# Settings Screen Consolidation

## Purpose

Root of the Settings tab. Provides a stable entry point for app-wide configuration and data management.

## Route

- **Route**: `Settings` (Settings tab root)
- **Title**: "Settings"

## Layout

### Header

- **Title**: "Settings"

### Main content (scrollable)

A scrollable list of setting sections and rows:

**1. Preferences section (inline)**

- Theme selector: `System | Light | Dark` segmented control
- Future: May move to a sub-screen if preferences grow

**2. Navigation rows**

| Row | Icon | Target |
|-----|------|--------|
| Assistant Setup | `sparkles-outline` | `ApiKeys` |
| Reminders | `notifications-outline` | `Reminders` |
| Sereus Connections | `cloud-outline` | `SereusConnections` |
| Backup & Restore | `save-outline` | `BackupRestore` |
| About | `information-circle-outline` | (future) `About` |
| Debug (dev-only) | `bug-outline` | stub |

### Bottom tab bar

Per `navigation.md`, 4 tabs (left → right): Home, Assistant, Catalog, Settings

| Tab       | Icon (Ionicons)                       | Active state      |
| --------- | ------------------------------------- | ----------------- |
| Home      | `home` / `home-outline`               | filled when active|
| Assistant | `sparkles` / `sparkles-outline`       | filled when active|
| Catalog   | `list` / `list-outline`               | filled when active|
| Settings  | `settings` / `settings-outline`       | filled when active|

## Navigation

| Action | Target |
|--------|--------|
| Assistant Setup row | `ApiKeys` |
| Reminders row | `Reminders` |
| Sereus Connections row | `SereusConnections` |
| Backup & Restore row | `BackupRestore` |
| Tab bar | switch tabs |

Settings is a tab root — no back button.

## i18n keys

```
settings.title: "Settings"
settings.preferences: "Preferences"
settings.theme: "Theme"
settings.assistantSetup: "Assistant Setup"
settings.reminders: "Reminders"
settings.sereusConnections: "Sereus Connections"
settings.backupRestore: "Backup & Restore"
settings.about: "About"
settings.debug: "Debug (dev)"
settings.themeSystem: "System"
settings.themeLight: "Light"
settings.themeDark: "Dark"
```

---

**Status**: Fresh consolidation
**Last Updated**: 2026-01-16
