# Deep Links & Universal / App Links

The app has two complementary link surfaces.

## 1. Custom scheme — `health://` (implemented, both platforms)

For **app-to-app, notifications, QR, and scenario tooling**. Any app can claim a
custom scheme, so it is *not* used for trusted web links.

- Format: `health://screen/<Route>?variant=<v>` (e.g. `health://screen/EditEntry?mode=new`).
- Android: `<data android:scheme="health"/>` intent-filter.
- iOS: `CFBundleURLTypes` registers `health`.
- Parsed in `src/mock/VariantContext.tsx`, routed in `App.tsx` (allow-list of screens).
- Used by: scenario/screenshot tooling and reminder-notification taps.

## 2. Universal / App Links — host `health.sereus.org` (app-side ready; server + iOS pending)

The **standard for trusted web→app links** (e.g. a shared guest-invite link, or the
APK download page linking into the app). Verified against a file the host serves, so
only this app opens them.

- Canonical host: **`health.sereus.org`** (a subdomain; distinct from the download page
  at `sereus.org/health`).
- Path convention mirrors the scheme: `https://health.sereus.org/screen/<Route>?...`.
- The parser (`parseDeepLink`) already strips both `health://` and
  `https://health.sereus.org/`, so the same routing handles both.

### App-side status
- **Android** — App Links intent-filter added with `android:autoVerify="true"` for
  `https` + host `health.sereus.org`. Inert (links open in browser) until the server
  file below is live, so it is safe to ship now.
- **iOS** — still needs the **Associated Domains** capability (see below).

### Server files to deploy (host root, once the subdomain is live)

**Android** — `https://health.sereus.org/.well-known/assetlinks.json`
(`Content-Type: application/json`). Get the signing cert SHA-256 with
`cd android && ./gradlew signingReport` (use the **release** keystore's fingerprint for
published builds; the debug fingerprint only verifies debug installs):

```json
[{
  "relation": ["delegate_permission/common.handle_all_urls"],
  "target": {
    "namespace": "android_app",
    "package_name": "org.sereus.health",
    "sha256_cert_fingerprints": ["<AA:BB:CC:… release signing SHA-256>"]
  }
}]
```

**iOS** — `https://health.sereus.org/.well-known/apple-app-site-association`
(no file extension, `Content-Type: application/json`, no redirects). `<TEAMID>` is the
Apple Developer Team ID:

```json
{
  "applinks": {
    "apps": [],
    "details": [{
      "appID": "<TEAMID>.org.sereus.health",
      "paths": ["/screen/*", "/invite/*"]
    }]
  }
}
```

### iOS app-side step (do in Xcode — do not hand-edit project.pbxproj)
1. Enable **Associated Domains** for `org.sereus.health` in the Apple Developer portal.
2. Xcode → target `mobile` → Signing & Capabilities → **+ Associated Domains** →
   add `applinks:health.sereus.org` (creates/updates `mobile.entitlements`).

### Files in this repo (`health/web/.well-known/`)

- **`assetlinks.json`** — committed and **functional for debug-signed builds**: it lists
  the debug keystore SHA-256 (`FA:C6:17:…:9C`), which signs the current test APK. Before
  a Play/release build, **add the release keystore's fingerprint** to the
  `sha256_cert_fingerprints` array (both can coexist). Get it with the release env vars
  set: `SEREUS_STORE_FILE=… SEREUS_STORE_PASSWORD=… ./gradlew signingReport`.
- **`apple-app-site-association`** — committed as a **template**: replace `TEAMID` with
  your Apple Developer Team ID. Not functional until then.

### Publishing (host requirement)

App Links are **host-scoped**: they are only read from `https://health.sereus.org/.well-known/…`.
`health/web` currently publishes to `sereus.org/health` (path-based), where these files are
inert. To make a publish light them up, **serve `health/web` at `health.sereus.org`** — i.e.
point `web/publish.sh`'s `DEST` at the `health.sereus.org` docroot (and set up the subdomain
with HTTPS). The `apple-app-site-association` file must be served with
`Content-Type: application/json`, no extension, no redirect.

### Verification
- Android: reinstall, then `adb shell pm get-app-links org.sereus.health` (expect
  `verified` for the host once assetlinks.json is served). Force a re-verify with
  `adb shell pm verify-app-links --re-verify org.sereus.health`.
- iOS: Apple's AASA validator, then tap an `https://health.sereus.org/screen/...` link.

### Notes
- `health.sereus.org` must serve **HTTPS** with a valid cert and the two `.well-known`
  files at the host root — not under `/health`.
- Bundle id stays `org.sereus.health`; the link *host* is `health.sereus.org`.
