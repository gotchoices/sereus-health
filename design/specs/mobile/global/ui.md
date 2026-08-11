# UI (Mobile)

This spec defines the shared visual foundations for the mobile app.

## Icon set

- Use **Ionicons** for app icons.
- Icon names should be specified by feature specs (e.g. tab bar icons in `navigation.md`).

## UI kit

- No UI kit is assumed at this time (plain React Native components).

## Theme

- Theme is user-selectable: `System | Light | Dark` (see `screens/settings.md`).
- Theme affects background/surface, text, borders, and error banners.

## Colors (semantic tokens)

Light mode:
- `background`: `#ffffff`
- `surface`: `#ffffff`
- `textPrimary`: `#111111`
- `textSecondary`: `#555555`
- `border`: `#dddddd`
- `bannerError`: `#ffeeee`

Dark mode:
- `background`: `#000000`
- `surface`: `#111111`
- `textPrimary`: `#eeeeee`
- `textSecondary`: `#bbbbbb`
- `border`: `#333333`
- `bannerError`: `#330000`

## Spacing scale

- 4, 8, 12, 16, 20, 24

## Typography

- **Title**: 20 / 600
- **Body**: 16 / 400
- **Small**: 12 / 400

## Screen headers & editor actions

- Screens have a top header row: **back** affordance (`chevron-back`) on the left, title next to it.
- **Editor screens** (create/edit/clone forms) commit via a **top-right header icon** (`save-outline`),
  **disabled until the form is valid** (`accentPrimary` when enabled, `textSecondary` when disabled).
  There is **no separate bottom "Save" button** — the primary action lives only in the header so it is
  always reachable without scrolling. Applies to EditItem, EditEntry, EditBundle, etc.
- A destructive per-record action (e.g. delete) sits to the **left of the save icon** in the header
  when the screen is in edit mode (`trash-outline`, `error` color).

## Date/time inputs

- Use platform-native pickers; keep presentation consistent (modal/inline) across screens.
