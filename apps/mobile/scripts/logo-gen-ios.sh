#!/bin/bash
# Generate iOS App Icons from SVG (React Native / iOS)
#
# iOS app icons live in an asset catalog:
#   ios/mobile/Images.xcassets/AppIcon.appiconset/
#
# This script renders a square icon with a peach background and the color logo
# centered on top, then writes all required sizes and updates Contents.json.
#
# Inputs (repo-wide brand assets):
#   - docs/images/logo_c-x.svg  (color logo on transparent)
#
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
APP_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"               # health/apps/mobile
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../../.." && pwd)"    # health/
ASSETS_DIR="$PROJECT_ROOT/docs/images"

APPICONSET_DIR="$APP_DIR/ios/mobile/Images.xcassets/AppIcon.appiconset"

# Brand color (peach background)
BG_COLOR="#fdf8f0"

echo "🍎 Generating iOS app icons..."
echo ""

# Check for ImageMagick
if ! command -v magick &> /dev/null; then
  echo "❌ ImageMagick not found. Install with: brew install imagemagick"
  exit 1
fi

if [ ! -d "$APPICONSET_DIR" ]; then
  echo "❌ AppIcon asset set not found at: $APPICONSET_DIR"
  exit 1
fi

tmpdir="$(mktemp -d)"
cleanup() { rm -rf "$tmpdir"; }
trap cleanup EXIT

# Create a 1024x1024 base with background + centered logo
magick -size 1024x1024 xc:"${BG_COLOR}" "$tmpdir/bg.png"
magick "$ASSETS_DIR/logo_c-x.svg" \
  -background none \
  -resize 760x760 \
  -gravity center \
  -extent 1024x1024 \
  "$tmpdir/logo.png"
magick "$tmpdir/bg.png" "$tmpdir/logo.png" -gravity center -composite "$tmpdir/AppIcon-1024.png"

write_icon() {
  local px="$1"
  local name="$2"
  magick "$tmpdir/AppIcon-1024.png" -resize "${px}x${px}" "$APPICONSET_DIR/$name"
}

# Required iOS icon sizes (in pixels)
write_icon 40   "AppIcon-20@2x.png"      # 20x20 @2x
write_icon 60   "AppIcon-20@3x.png"      # 20x20 @3x
write_icon 58   "AppIcon-29@2x.png"      # 29x29 @2x
write_icon 87   "AppIcon-29@3x.png"      # 29x29 @3x
write_icon 80   "AppIcon-40@2x.png"      # 40x40 @2x
write_icon 120  "AppIcon-40@3x.png"      # 40x40 @3x
write_icon 120  "AppIcon-60@2x.png"      # 60x60 @2x
write_icon 180  "AppIcon-60@3x.png"      # 60x60 @3x
cp -f "$tmpdir/AppIcon-1024.png" "$APPICONSET_DIR/AppIcon-1024.png"  # App Store marketing

cat > "$APPICONSET_DIR/Contents.json" <<'JSON'
{
  "images" : [
    { "filename" : "AppIcon-20@2x.png", "idiom" : "iphone", "scale" : "2x", "size" : "20x20" },
    { "filename" : "AppIcon-20@3x.png", "idiom" : "iphone", "scale" : "3x", "size" : "20x20" },

    { "filename" : "AppIcon-29@2x.png", "idiom" : "iphone", "scale" : "2x", "size" : "29x29" },
    { "filename" : "AppIcon-29@3x.png", "idiom" : "iphone", "scale" : "3x", "size" : "29x29" },

    { "filename" : "AppIcon-40@2x.png", "idiom" : "iphone", "scale" : "2x", "size" : "40x40" },
    { "filename" : "AppIcon-40@3x.png", "idiom" : "iphone", "scale" : "3x", "size" : "40x40" },

    { "filename" : "AppIcon-60@2x.png", "idiom" : "iphone", "scale" : "2x", "size" : "60x60" },
    { "filename" : "AppIcon-60@3x.png", "idiom" : "iphone", "scale" : "3x", "size" : "60x60" },

    { "filename" : "AppIcon-1024.png", "idiom" : "ios-marketing", "scale" : "1x", "size" : "1024x1024" }
  ],
  "info" : { "author" : "xcode", "version" : 1 }
}
JSON

echo "✅ iOS app icons generated"
echo "   - $APPICONSET_DIR"
echo ""
echo "Rebuild in Xcode / rerun the iOS app to see the updated icon."


