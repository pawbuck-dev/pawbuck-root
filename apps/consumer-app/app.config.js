/**
 * Dynamic Expo config: loads `.env` / `.env.local`, wires **expo-maps** (Apple Maps on iOS, Google on Android).
 *
 * Android: set `GOOGLE_MAPS_ANDROID_API_KEY` (Maps SDK for Android). iOS uses Apple Maps — no Google iOS key needed for the map view.
 *
 * Local: keys in `.env.local`, then `npx expo prebuild`. EAS: same env var names as secrets.
 *
 * @see https://docs.expo.dev/versions/latest/sdk/maps/
 */
const fs = require("fs");
const path = require("path");

/** Load KEY=value pairs into process.env (Expo also loads .env*; this guarantees prebuild sees .env.local). */
function loadEnvFile(fileName) {
  const full = path.join(__dirname, fileName);
  if (!fs.existsSync(full)) return;
  const text = fs.readFileSync(full, "utf8");
  for (const line of text.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    let val = trimmed.slice(eq + 1).trim();
    if (
      (val.startsWith('"') && val.endsWith('"')) ||
      (val.startsWith("'") && val.endsWith("'"))
    ) {
      val = val.slice(1, -1);
    }
    process.env[key] = val;
  }
}

loadEnvFile(".env");
loadEnvFile(".env.local");

module.exports = ({ config }) => ({
  ...config,
  android: {
    ...config.android,
    config: {
      ...config.android?.config,
      googleMaps: {
        ...(config.android?.config?.googleMaps ?? {}),
        apiKey: process.env.GOOGLE_MAPS_ANDROID_API_KEY ?? "",
      },
    },
  },
  plugins: [
    ...(config.plugins ?? []),
    [
      "expo-build-properties",
      {
        ios: {
          useFrameworks: "static",
        },
      },
    ],
    [
      "expo-maps",
      {
        requestLocationPermission: false,
      },
    ],
  ],
});
