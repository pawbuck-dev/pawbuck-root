/**
 * Base URL for PawBuck.API (scheduling, etc.). No trailing slash.
 * Example: http://127.0.0.1:5087 or https://api.pawbuck.app
 */
export function getPawbuckApiBaseUrl(): string | null {
  const raw = process.env.EXPO_PUBLIC_PAWBUCK_API_URL?.trim();
  if (!raw) return null;
  return raw.replace(/\/$/, "");
}
