---
title: Mobile Build & Release (Fastlane)
---

## Goal

Provide a consistent, scriptable way to build **signed Android release artifacts** for Sereus Health.

## Android (Fastlane)

### Location

- Fastlane lives in `apps/mobile/android/fastlane/`

### Environment variables

- `SEREUS_STORE_FILE`: absolute path to the Android keystore (`.keystore`/`.jks`)
- `SEREUS_STORE_PASSWORD`: keystore password (also used as key password)
- `SEREUS_KEY_ALIAS` (optional): key alias (default: `org.sereus.health`)
- `GOOGLE_PLAY_API_FILE` (optional): path to Play Console service account JSON (reserved for future upload lanes)

### NPM scripts (from `apps/mobile/package.json`)

- `build:android:apk`: build a signed release APK via fastlane
- `build:android:aab`: build a signed release AAB via fastlane

### Outputs

- APK: `apps/mobile/android/app/build/outputs/apk/release/app-release.apk`
- AAB: `apps/mobile/android/app/build/outputs/bundle/release/app-release.aab`


