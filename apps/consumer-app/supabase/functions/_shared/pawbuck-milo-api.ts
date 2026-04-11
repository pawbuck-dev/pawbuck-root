/**
 * Thin bridge from Edge to PawBuck.API for Milo shared retrieval (curated guidance).
 * Set PAWBUCK_API_URL and MILO_INTERNAL_SERVICE_KEY on the Edge function when API should own DB reads.
 */
export const MILO_INTERNAL_HEADER = "X-Pawbuck-Milo-Internal-Key";

export function getPawbuckApiBaseUrl(): string | null {
  const u = Deno.env.get("PAWBUCK_API_URL")?.trim();
  return u ? u.replace(/\/$/, "") : null;
}

export function getMiloInternalServiceKey(): string | null {
  return Deno.env.get("MILO_INTERNAL_SERVICE_KEY")?.trim() ?? null;
}
