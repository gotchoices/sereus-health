# App Icons

## Overview

This repo keeps **brand artwork** in `docs/images/` and then each app/platform integrates it using its own framework-native mechanism.

For Android, Sereus Health uses **Android Adaptive Icons** (API 26+) for modern, device-agnostic app icon display. The system automatically masks your icon to match the device manufacturer's preferred shape (circle, square, squircle, etc.).

## How It Works

### Adaptive Icon Layers

Android adaptive icons consist of two layers:

1. **Background Layer**: Solid color defined in `android/app/src/main/res/values/ic_launcher_background.xml`
   - Currently: Peach (`#fdf8f0`) from the Sereus brand

2. **Foreground Layer**: Logo artwork with transparent background
   - Source: `docs/images/logo_c-x.svg` (color logo on transparent)
   - Output: PNG files at 5 densities (mdpi through xxxhdpi)

### Why This Approach?

**Problem with simple PNG icons:**
- Square PNG with rounded corners doesn't fill device-specific shapes
- Creates black/white padding when system masks to circle/squircle
- Looks inconsistent across different Android devices

**Solution with adaptive icons:**
- System composites background + foreground
- Automatically masks to device shape
- Scales and centers artwork appropriately
- **Result**: Full peach circle/square/squircle with color logo, no padding! ✅

## Source Files

Located in `docs/images/`:

- **`logo_c-x.svg`**: Color logo on transparent (**USED FOR APP ICON**)
  - Perfect for adaptive icon foreground layer with peach background

- **`logo_c-p.svg`**: Color logo on peach rectangle
  - Used for in-app logo display
  
- **`logo_b-x.svg`**: Black logo on transparent
  - Source artwork variant

- **`logo_w-b.svg`**: White logo on black
  - Alternative design

## Generating Icons

### Automatic (Recommended)

```bash
# From repo root:
yarn --cwd apps/mobile icons:android

# Or from apps/mobile:
yarn icons:android
```

This script:
1. Converts `logo_c-x.svg` to PNG at all Android densities
2. Places files in correct `mipmap-*` directories
3. Preserves transparency for proper layering
4. Generates legacy fallback icons (pre-Android 8.0)
5. Creates in-app logo at `src/assets/logo.png`

Implementation note: the scripts live under `apps/mobile/scripts/` and are intentionally **React Native / platform specific** (Android/iOS).

### Manual

If you need custom sizes or want to experiment:

```bash
# Example: Generate xxxhdpi (432x432)
magick docs/images/logo_c-x.svg \
    -background none \
    -resize 432x432 \
    -gravity center \
    -extent 432x432 \
    android/app/src/main/res/mipmap-xxxhdpi/ic_launcher_foreground.png
```

### Densities

| Density | Size | Multiplier |
|---------|------|------------|
| mdpi | 108x108 | 1.0x |
| hdpi | 162x162 | 1.5x |
| xhdpi | 216x216 | 2.0x |
| xxhdpi | 324x324 | 3.0x |
| xxxhdpi | 432x432 | 4.0x |

## File Structure

```
android/app/src/main/res/
├── drawable/
│   └── ic_launcher_background.xml    # Background shape
├── mipmap-anydpi-v26/
│   ├── ic_launcher.xml               # Adaptive icon config (square)
│   └── ic_launcher_round.xml         # Adaptive icon config (round)
├── mipmap-xxxhdpi/
│   ├── ic_launcher.png               # Legacy fallback (API < 26)
│   ├── ic_launcher_round.png         # Legacy fallback (API < 26)
│   └── ic_launcher_foreground.png    # ✅ Adaptive icon foreground
├── mipmap-xxhdpi/
│   └── ic_launcher_foreground.png
├── mipmap-xhdpi/
│   └── ic_launcher_foreground.png
├── mipmap-hdpi/
│   └── ic_launcher_foreground.png
├── mipmap-mdpi/
│   └── ic_launcher_foreground.png
└── values/
    └── ic_launcher_background.xml    # Background color (#fdf8f0 peach)

src/assets/
└── logo.png                          # In-app logo (108x108)
```

## Testing

After regenerating icons:

```bash
# Clean build
cd android && ./gradlew clean && cd ..

# Rebuild and install
npx react-native run-android

# Or build release APK
cd android && ./gradlew assembleRelease
```

**Visual Check:**
- App drawer icon should be peach circle/square (no black edges)
- Long-press for quick actions should show consistent peach background
- App switcher should display properly
- In-app header should show the logo next to "Sereus Health"

## iOS Icons

iOS uses an asset catalog (`.xcassets`). This repo generates the required PNGs and writes them into:

- `apps/mobile/ios/mobile/Images.xcassets/AppIcon.appiconset/`

Generate/update iOS icons:

```bash
# From repo root:
yarn --cwd apps/mobile icons:ios
```

Or generate both Android + iOS:

```bash
yarn --cwd apps/mobile icons:all
```

## References

- [Android Adaptive Icons Guide](https://developer.android.com/develop/ui/views/launch/icon_design_adaptive)
- [Icon Design Specifications](https://m3.material.io/styles/icons/overview)

