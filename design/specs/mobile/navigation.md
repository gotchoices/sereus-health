# Navigation (Mobile)

This spec defines the **user-visible** navigation structure: what tabs exist, what each tab contains, and how the user moves between major areas of the app.

## Bottom tab bar (single source of truth)

Tabs are pinned to the bottom; screen content scrolls above them.

| Tab | Purpose | Root |
|-----|---------|------|
| Home | History and logging | `LogHistory` |
| Catalog | Manage catalog items/bundles | `ConfigureCatalog` |
| Assistant | AI assistant | `Assistant` |
| Settings | Preferences and utilities | `Settings` |

Icons should be simple and recognizable (home, list, sparkles, gear).

## What lives under each tab

- **Home**
  - `LogHistory` (history list)
  - From history, users can create a new entry, clone an entry, and navigate to graphs.

- **Catalog**
  - `ConfigureCatalog` (items/bundles management)
  - From catalog, users can create/edit items and bundles, and import/export catalog data.

- **Assistant**
  - `Assistant` (assistant UI)
  - If not configured, the user can navigate to **Assistant Setup** (`ApiKeys`).

- **Settings**
  - `Settings` (root list of settings sections)
  - Sub-screens include:
    - `Reminders`
    - `SereusConnections`
    - `BackupRestore`
    - `ApiKeys` (Assistant Setup)

## Navigation rules

- Within a tab, the back button returns to the previous screen in that tab.
- Switching tabs changes context; tabs do not form a back-stack between each other.
- At a tab root, Android system back exits the app.

