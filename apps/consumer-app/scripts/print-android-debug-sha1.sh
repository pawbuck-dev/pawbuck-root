#!/usr/bin/env bash
# Print SHA-1 (and SHA-256) for the consumer-app debug keystore so you can add them in
# Google Cloud Console → APIs & Services → Credentials → your Android OAuth client
# (package name: com.pawbuck.app). Fixes Google Sign-In DEVELOPER_ERROR on local builds.
#
# Official troubleshooting: https://react-native-google-signin.github.io/docs/troubleshooting

set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
KEY="$ROOT/debug.keystore"
if [[ ! -f "$KEY" ]]; then
  echo "Missing $KEY — run prebuild once (expo run:android creates android/; postprebuild copies debug.keystore)." >&2
  exit 1
fi

echo "Package (from app.json): com.pawbuck.app"
echo "Keystore: $KEY"
echo ""
keytool -list -v -keystore "$KEY" -alias androiddebugkey -storepass android -keypass android \
  | grep -E 'SHA1:|SHA256:'
