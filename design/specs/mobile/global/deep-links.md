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

## 2. Universal / App Links — path-based on `sereus.org` (app-side ready; server + iOS pending)

The **standard for trusted web→app links** (e.g. a shared guest-invite link). This
mirrors `chat/apps/mobile` exactly: pages are **path-based** under the shared
`sereus.org` host, while the association files live at the **host root** and are
**merged** across apps.

- Host: **`sereus.org`** (shared). Health's landing page stays at `sereus.org/health`.
- The app claims only **`/health/invite/*`** (guest-invite links) — deliberately NOT the
  `/health` landing/download page, so tapping the download link doesn't force-open the app
  (mirrors chat's `/chat/invite`).
- Link form: `https://sereus.org/health/invite/<token>`. The parser
  (`parseDeepLink`) strips both `health://` and `https://sereus.org/health/`, so the same
  routing handles both surfaces.

### App-side status
- **Android** — App Links intent-filter with `autoVerify`, `host="sereus.org"`,
  `pathPrefix="/health/invite"`. Inert (opens the browser) until the merged apex file
  below is served, so it is safe to ship now.
- **iOS** — still needs the **Associated Domains** capability: `applinks:sereus.org`
  (Xcode → Signing & Capabilities; enable the capability in the Developer portal). Do NOT
  hand-edit `project.pbxproj`.

### Association files: single-app in this repo, MERGED into the apex on deploy

App Links / Universal Links are read only from the **host root**
(`https://sereus.org/.well-known/…`), which is shared with chat and any other Sereus app.
`web/publish.sh` therefore:
1. publishes page content to `sereus.org/health` (`--delete` scoped to that dir), and
2. **merges** `web/.well-known/{assetlinks.json, apple-app-site-association}` into the apex
   `sereus.org/.well-known/…` by key (`package_name` / `appID`) — never clobbering chat's
   entries. (Same python merge as chat's publish script.)

Files in `health/web/.well-known/`:
- **`assetlinks.json`** — health's single Android statement. **Functional for debug-signed
  builds** (carries the shared debug keystore SHA-256 `FA:C6:17:…:9C`, same keystore chat
  uses). **Before a release/Play build, add the release keystore fingerprint** to the array
  (`SEREUS_STORE_FILE=… SEREUS_STORE_PASSWORD=… ./gradlew signingReport`).
- **`apple-app-site-association`** — health's single iOS detail, `paths: ["/health/invite/*"]`.
  Replace `TEAMID` with the Apple Developer Team ID (nothing in the repo has it yet).

After a health publish and a chat publish, the apex `assetlinks.json` holds both
`org.sereus.health` and `org.sereus.chat` statements, and the apex AASA holds both details.

### Verification
- Android: reinstall, then `adb shell pm get-app-links org.sereus.health` (expect
  `verified` for `sereus.org` once assetlinks.json is served). Re-verify with
  `adb shell pm verify-app-links --re-verify org.sereus.health`.
- Apex must return **200, valid JSON, no redirect**; AASA served as
  `Content-Type: application/json` with no extension.

### Notes
- Bundle id stays `org.sereus.health`; the link host is `sereus.org`, path `/health/…`.
- `/health/invite/*` needs an invite landing page + host rewrite when inbound guest-invite
  redemption is wired (not implemented yet — see the networking story).
