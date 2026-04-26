#!/usr/bin/env bash
# Capture PNG screenshots from a connected Android device or emulator via adb.
# Usage:
#   1. Open Pawbuck on the device (after Metro is connected, or use a release build).
#   2. Navigate to each screen you want in the store listing.
#   3. Run: ./scripts/capture-android-screenshots.sh my-screen-name
#      (Press Enter between navigations to capture another frame with a new name.)
#
# Requires ANDROID_HOME (defaults to ~/Library/Android/sdk on macOS).

set -euo pipefail
ANDROID_HOME="${ANDROID_HOME:-$HOME/Library/Android/sdk}"
ADB="$ANDROID_HOME/platform-tools/adb"
OUT_DIR="$(cd "$(dirname "$0")/.." && pwd)/assets/store-google-play/phone-screenshots/device"

if [[ ! -x "$ADB" ]]; then
  echo "adb not found at $ADB — set ANDROID_HOME." >&2
  exit 1
fi

if ! "$ADB" devices | grep -qE '^\S+\s+device$'; then
  echo "No device in 'adb devices'. Start an emulator or plug in a phone with USB debugging." >&2
  exit 1
fi

mkdir -p "$OUT_DIR"
slug="${1:-shot}"
ts="$(date +%Y%m%d_%H%M%S)"
out="$OUT_DIR/${slug}_${ts}.png"
"$ADB" exec-out screencap -p >"$out"
echo "Saved $out"
echo "Tip: resize for Play (e.g. 1080 wide) with: sips -Z 1080 \"$out\""
