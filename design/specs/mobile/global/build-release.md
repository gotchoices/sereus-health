---
title: Mobile Build & Release (Fastlane)
---

## Goal

Provide a consistent, scriptable way to build **signed release artifacts** for Sereus Health on both
platforms, from a single source of truth for versioning.

## Versioning (single source of truth)

Version lives in **`apps/mobile/version.json`**:

```json
{ "version": "1.0.0", "build": 1 }
```

- **`version`** — marketing/user-facing semver. iOS `MARKETING_VERSION` = Android `versionName`.
- **`build`** — monotonic integer, must increase on **every** store upload. iOS
  `CURRENT_PROJECT_VERSION` = Android `versionCode`.

How each platform consumes it:

- **Android** reads `version.json` **live** at Gradle configure time
  (`android/app/build.gradle` → `JsonSlurper`), so nothing to stamp.
- **iOS** build settings can't read an external file, so `scripts/version.js` **stamps** the
  values into `ios/mobile.xcodeproj/project.pbxproj` (both Debug + Release configs). It also keeps
  `package.json`'s `version` in sync.

**Always change the version via the scripts** (they update every location and validate):

| Command | Effect |
|---|---|
| `yarn version:show` | Print the source version + each platform's effective value; flags any drift |
| `yarn version:bump` | Patch bump (`1.0.0 → 1.0.1`) **and** increment build |
| `yarn version:bump minor` / `major` | Minor/major bump, resets lower parts, increments build |
| `yarn version:build` | Increment build only (e.g. a re-upload of the same marketing version) |
| `node scripts/version.js set <version> [build]` | Set explicitly (build auto-increments if omitted) |

After any bump, commit `version.json`, `package.json`, and the `project.pbxproj` diff together.

## Android (Fastlane)

- **Location:** `apps/mobile/android/fastlane/`
- **Environment variables:**
  - `STORE_FILE_HEALTH`: absolute path to the Android keystore (`.keystore`/`.jks`)
  - `STORE_PASSWORD_HEALTH`: keystore password (also used as key password)
  - `KEY_ALIAS_HEALTH` (optional): key alias (default: `org.sereus.health`)
  - `GOOGLE_PLAY_API_FILE` (optional): Play Console service-account JSON (reserved for future upload lanes)
- **NPM scripts** (from `apps/mobile/`):
  - `yarn build:android:apk` — signed release APK
  - `yarn build:android:aab` — signed release AAB (Play Store)
- **Outputs:**
  - APK: `apps/mobile/android/app/build/outputs/apk/release/app-release.apk`
  - AAB: `apps/mobile/android/app/build/outputs/bundle/release/app-release.aab`

## iOS (Fastlane)

- **Location:** `apps/mobile/ios/fastlane/`
- **Environment variables:**
  - `SEREUS_IOS_TEAM_ID` (required for signed builds): Apple Developer Team ID (10 chars)
  - `SEREUS_IOS_EXPORT_METHOD` (optional): `app-store` (default), `ad-hoc`, `development`, `enterprise`
  - TestFlight upload (`beta` lane) — App Store Connect API key:
    `SEREUS_IOS_APPLE_ID`, `ASC_KEY_ID`, `ASC_ISSUER_ID`, `ASC_KEY_FILEPATH` (path to the `.p8`)
- **NPM scripts** (from `apps/mobile/`):
  - `yarn build:ios:sim` — unsigned Debug simulator build (CI smoke test; no Apple account)
  - `yarn build:ios:ipa` — signed Release `.ipa` for manual distribution
  - `yarn build:ios:beta` — signed Release → upload to TestFlight
- **Output:** `.ipa` under `apps/mobile/ios/build/`
- **Note:** iOS pods must be in sync before a release build — run `cd ios && bundle exec pod install`
  whenever a native dependency was added, removed, or version-bumped.

## Release workflow (steps)

1. **Pick the version.** `yarn version:bump` (or `bump minor`/`major`, or `version:build` for a
   re-upload). Verify with `yarn version:show` (no drift warnings), then commit the version diff.
2. **Clean install / sync native deps** (especially after dependency changes):
   `yarn install` → `cd ios && bundle exec pod install` (iOS). Android autolinks on build.
3. **Sanity check:** `yarn tsc --noEmit` (typecheck) and, if driving the app, a smoke build
   (`yarn build:ios:sim`).
4. **Android:** `yarn build:android:aab` (Play Store) or `yarn build:android:apk` (direct). Requires
   `STORE_FILE_HEALTH` / `STORE_PASSWORD_HEALTH`. Upload the AAB via Play Console.
5. **iOS:** `yarn build:ios:ipa` (requires `SEREUS_IOS_TEAM_ID` + signing) then upload via Transporter,
   **or** `yarn build:ios:beta` to build + push to TestFlight directly (requires the ASC API-key vars).
6. **Tag the release** in git to match `version.json`.

Dev-only diagnostics (Settings → benchmark rows, import phase logging) are `__DEV__`-gated and do not
appear in release builds.
