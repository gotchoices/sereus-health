#!/bin/bash
# Generate Android App Icons from SVG (React Native / Android)
#
# This script generates adaptive icon layers for Android from the source SVG files.
#
# Android Adaptive Icons (API 26+):
# - Background layer: Solid color (defined in ic_launcher_background.xml)
# - Foreground layer: Logo artwork with transparency
# - System masks these layers to device-specific shapes (circle, square, squircle)
#
# Source files:
# - docs/images/logo_c-x.svg: Color logo on transparent background
#
# Output:
# - Foreground PNGs at 5 densities (mdpi through xxxhdpi)
# - Legacy fallback icons (composite of background + foreground)
# - In-app logo PNG

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
APP_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"               # health/apps/mobile
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../../.." && pwd)"    # health/
ASSETS_DIR="$PROJECT_ROOT/docs/images"

# Brand color (peach background)
BG_COLOR="#fdf8f0"

echo "🎨 Generating Sereus Health app icons (Android)..."
echo ""

# Check for ImageMagick
if ! command -v magick &> /dev/null; then
    echo "❌ ImageMagick not found. Install with: brew install imagemagick"
    exit 1
fi

cd "$APP_DIR"

# Ensure directories exist
mkdir -p android/app/src/main/res/mipmap-{mdpi,hdpi,xhdpi,xxhdpi,xxxhdpi}
mkdir -p src/assets

echo "📱 Generating foreground layers..."

# xxxhdpi: 432x432 (density 4.0)
magick "$ASSETS_DIR/logo_c-x.svg" \
    -background none \
    -resize 432x432 \
    -gravity center \
    -extent 432x432 \
    android/app/src/main/res/mipmap-xxxhdpi/ic_launcher_foreground.png

# xxhdpi: 324x324 (density 3.0)
magick "$ASSETS_DIR/logo_c-x.svg" \
    -background none \
    -resize 324x324 \
    -gravity center \
    -extent 324x324 \
    android/app/src/main/res/mipmap-xxhdpi/ic_launcher_foreground.png

# xhdpi: 216x216 (density 2.0)
magick "$ASSETS_DIR/logo_c-x.svg" \
    -background none \
    -resize 216x216 \
    -gravity center \
    -extent 216x216 \
    android/app/src/main/res/mipmap-xhdpi/ic_launcher_foreground.png

# hdpi: 162x162 (density 1.5)
magick "$ASSETS_DIR/logo_c-x.svg" \
    -background none \
    -resize 162x162 \
    -gravity center \
    -extent 162x162 \
    android/app/src/main/res/mipmap-hdpi/ic_launcher_foreground.png

# mdpi: 108x108 (density 1.0)
magick "$ASSETS_DIR/logo_c-x.svg" \
    -background none \
    -resize 108x108 \
    -gravity center \
    -extent 108x108 \
    android/app/src/main/res/mipmap-mdpi/ic_launcher_foreground.png

echo "✅ Foreground layers generated"
echo ""

echo "📦 Generating legacy fallback icons (pre-Android 8.0)..."

# Composite background with foreground for legacy icons
# NOTE: Legacy launcher icons are *single-layer* bitmaps. If we composite a larger
# adaptive foreground (e.g. 432x432) onto a smaller legacy canvas (e.g. 192x192),
# ImageMagick will clip the foreground. So we explicitly resize the foreground
# to match the legacy size before compositing.

# xxxhdpi: 192x192
magick -size 192x192 xc:"${BG_COLOR}" /tmp/ic_launcher_bg_xxxhdpi.png
magick android/app/src/main/res/mipmap-xxxhdpi/ic_launcher_foreground.png \
    -resize 192x192 /tmp/ic_launcher_fg_xxxhdpi.png
magick /tmp/ic_launcher_bg_xxxhdpi.png /tmp/ic_launcher_fg_xxxhdpi.png \
    -gravity center -composite android/app/src/main/res/mipmap-xxxhdpi/ic_launcher.png
cp android/app/src/main/res/mipmap-xxxhdpi/ic_launcher.png android/app/src/main/res/mipmap-xxxhdpi/ic_launcher_round.png

# xxhdpi: 144x144
magick -size 144x144 xc:"${BG_COLOR}" /tmp/ic_launcher_bg_xxhdpi.png
magick android/app/src/main/res/mipmap-xxhdpi/ic_launcher_foreground.png \
    -resize 144x144 /tmp/ic_launcher_fg_xxhdpi.png
magick /tmp/ic_launcher_bg_xxhdpi.png /tmp/ic_launcher_fg_xxhdpi.png \
    -gravity center -composite android/app/src/main/res/mipmap-xxhdpi/ic_launcher.png
cp android/app/src/main/res/mipmap-xxhdpi/ic_launcher.png android/app/src/main/res/mipmap-xxhdpi/ic_launcher_round.png

# xhdpi: 96x96
magick -size 96x96 xc:"${BG_COLOR}" /tmp/ic_launcher_bg_xhdpi.png
magick android/app/src/main/res/mipmap-xhdpi/ic_launcher_foreground.png \
    -resize 96x96 /tmp/ic_launcher_fg_xhdpi.png
magick /tmp/ic_launcher_bg_xhdpi.png /tmp/ic_launcher_fg_xhdpi.png \
    -gravity center -composite android/app/src/main/res/mipmap-xhdpi/ic_launcher.png
cp android/app/src/main/res/mipmap-xhdpi/ic_launcher.png android/app/src/main/res/mipmap-xhdpi/ic_launcher_round.png

# hdpi: 72x72
magick -size 72x72 xc:"${BG_COLOR}" /tmp/ic_launcher_bg_hdpi.png
magick android/app/src/main/res/mipmap-hdpi/ic_launcher_foreground.png \
    -resize 72x72 /tmp/ic_launcher_fg_hdpi.png
magick /tmp/ic_launcher_bg_hdpi.png /tmp/ic_launcher_fg_hdpi.png \
    -gravity center -composite android/app/src/main/res/mipmap-hdpi/ic_launcher.png
cp android/app/src/main/res/mipmap-hdpi/ic_launcher.png android/app/src/main/res/mipmap-hdpi/ic_launcher_round.png

# mdpi: 48x48
magick -size 48x48 xc:"${BG_COLOR}" /tmp/ic_launcher_bg_mdpi.png
magick android/app/src/main/res/mipmap-mdpi/ic_launcher_foreground.png \
    -resize 48x48 /tmp/ic_launcher_fg_mdpi.png
magick /tmp/ic_launcher_bg_mdpi.png /tmp/ic_launcher_fg_mdpi.png \
    -gravity center -composite android/app/src/main/res/mipmap-mdpi/ic_launcher.png
cp android/app/src/main/res/mipmap-mdpi/ic_launcher.png android/app/src/main/res/mipmap-mdpi/ic_launcher_round.png

# Cleanup temp files
rm /tmp/ic_launcher_bg_*.png /tmp/ic_launcher_fg_*.png

echo "✅ Legacy fallback icons generated"
echo ""

echo "🖼️  Generating in-app logo..."

# Generate in-app logo from the peach background version
# Use @3x size (108px) for good quality on high-DPI screens
magick "$ASSETS_DIR/logo_c-p.svg" \
    -resize 108x108 \
    src/assets/logo.png

echo "✅ In-app logo generated"
echo ""

echo "📋 Adaptive icon XML files:"
echo "   - android/app/src/main/res/mipmap-anydpi-v26/ic_launcher.xml"
echo "   - android/app/src/main/res/mipmap-anydpi-v26/ic_launcher_round.xml"
echo "   - android/app/src/main/res/drawable/ic_launcher_background.xml"
echo "   - android/app/src/main/res/values/ic_launcher_background.xml"
echo ""

echo "🎉 Done! Rebuild the app to see new icons."
echo "   cd android && ./gradlew clean && cd .."
echo "   npx react-native run-android"

