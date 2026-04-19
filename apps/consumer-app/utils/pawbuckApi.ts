/**
 * Base URL for PawBuck.API (scheduling, paywall gates, etc.). No trailing slash.
 * Simulator: `http://127.0.0.1:5289` works. Physical device: use your machine’s LAN IP or a deployed API — 127.0.0.1 is the phone itself.
 */
export function getPawbuckApiBaseUrl(): string | null {
  const raw = process.env.EXPO_PUBLIC_PAWBUCK_API_URL?.trim();
  if (!raw) return null;
  return raw.replace(/\/$/, "");
}
