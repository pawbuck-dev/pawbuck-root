/**
 * Extends static `app.json` to inject the react-native-maps config plugin with API keys from the environment.
 * Create keys: Google Cloud Console → enable Maps SDK for iOS & Android → restrict by bundle ID / package + SHA-1.
 *
 * Local dev: put keys in `.env.local` (gitignored) or export env vars, then `npx expo prebuild`.
 * EAS: set GOOGLE_MAPS_IOS_API_KEY / GOOGLE_MAPS_ANDROID_API_KEY as secrets for the build profile.
 *
 * @see https://docs.expo.dev/versions/latest/sdk/map-view/
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
  plugins: [
    ...(config.plugins ?? []),
    [
      "react-native-maps",
      {
        iosGoogleMapsApiKey: process.env.GOOGLE_MAPS_IOS_API_KEY ?? "",
        androidGoogleMapsApiKey: process.env.GOOGLE_MAPS_ANDROID_API_KEY ?? "",
      },
    ],
  ],
});
