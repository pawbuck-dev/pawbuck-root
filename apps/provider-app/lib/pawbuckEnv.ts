/**
 * Shared env helpers for provider app (parity with consumer `utils/pawbuckApi.ts`).
 */
export function getPawbuckApiBaseUrl(): string | null {
  const raw = process.env.EXPO_PUBLIC_PAWBUCK_API_URL?.trim();
  if (!raw) return null;
  return raw.replace(/\/$/, "");
}
