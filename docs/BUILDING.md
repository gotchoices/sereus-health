# Building for Distribution

## Prerequisites

1. **Ruby & Bundler** - Install fastlane dependencies from project root:
   ```bash
   bundle install
   ```
   
   > **Note:** Use the system Ruby (`/usr/bin/ruby`). If you have Homebrew Ruby installed, ensure `bundle install` runs with the same Ruby that npm scripts will use. The Gemfile.lock records the Ruby version.

2. **Environment Variables** - Set before building:
   ```bash
   export SEREUS_STORE_FILE=/path/to/your-keystore.keystore
   export SEREUS_STORE_PASSWORD=your_password
   # Optional: export SEREUS_KEY_ALIAS=your_alias  (defaults to org.sereus.health)
   ```

## Android

### Build APK (for direct distribution)

```bash
npm run build:android:apk
```

Output: `android/app/build/outputs/apk/release/app-release.apk`

### Build App Bundle (for Play Store)

```bash
npm run build:android:aab
```

Output: `android/app/build/outputs/bundle/release/app-release.aab`

### Install APK

```bash
adb install android/app/build/outputs/apk/release/app-release.apk
```

### Keystore Management

**Generate a new keystore:**
```bash
keytool -genkeypair -v -storetype PKCS12 \
  -keystore sereus-health.keystore \
  -alias org.sereus.health \
  -keyalg RSA -keysize 2048 -validity 10000
```

**Verify keystore:**
```bash
keytool -list -v -keystore $SEREUS_STORE_FILE
```

**Verify APK signature:**
```bash
jarsigner -verify -verbose -certs \
  android/app/build/outputs/apk/release/app-release.apk
```

**⚠️ Backup your keystore securely.** If lost, you cannot update your app on the Play Store.

## iOS

### Build Archive (IPA)

*(Not yet configured)*

```bash
npm run build:ios
```

**Note:** Requires a valid provisioning profile. See [STATUS.md](STATUS.md) for setup steps.

### Provisioning Profile Setup

1. Go to [Apple Developer Portal](https://developer.apple.com/account/resources/profiles/list)
2. Create an "App Store" distribution profile for `org.sereus.health`
3. Configure `ios/fastlane/Fastfile` with the profile name

## Troubleshooting

**Missing environment variables:**
```
SEREUS_STORE_FILE environment variable is not set
```
→ Set the required environment variables before running build commands.

**Keystore not found:**
```
Keystore file not found at: /path/to/keystore
```
→ Verify `SEREUS_STORE_FILE` points to an existing file.

**Could not find gems in locally installed gems:**
```
Could not find cocoapods-1.15.2, activesupport-6.1.7.10, ... in locally installed gems
```
→ Ruby version mismatch. Gems were installed with a different Ruby than what's running. Fix:
```bash
rm -rf vendor/bundle Gemfile.lock
/usr/bin/bundle install   # Use system Ruby explicitly
```

**iOS provisioning error:**
```
Couldn't automatically detect the provisioning profile mapping
```
→ Create and configure a provisioning profile in the Apple Developer Portal.

## Security Best Practices

- ✅ Never commit keystore to git
- ✅ Store credentials in environment variables (not in files)
- ✅ Keep keystore file outside the repository
- ✅ Use a password manager for credential storage
- ✅ Consider [Google Play App Signing](https://support.google.com/googleplay/android-developer/answer/9842756) for production

