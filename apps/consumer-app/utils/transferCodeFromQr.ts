/**
 * Extract a pet transfer code from a scanned QR payload.
 * Owner share QR encodes the plain code (e.g. TRF-LUNA-2024-ABC1).
 * Deep links may include ?transferCode=…
 */
export function extractTransferCodeFromQrPayload(raw: string): string | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;

  // Deep / universal link: …?transferCode=TRF-…
  const queryMatch = trimmed.match(/[?&#]transferCode=([^&#\s]+)/i);
  if (queryMatch?.[1]) {
    try {
      return decodeURIComponent(queryMatch[1]).trim().toUpperCase() || null;
    } catch {
      return queryMatch[1].trim().toUpperCase() || null;
    }
  }

  // Path segment: /transfer-pet/TRF-… or transfer-pet?…
  const pathMatch = trimmed.match(/transfer-pet\/([A-Za-z0-9_-]+)/i);
  if (pathMatch?.[1] && !pathMatch[1].includes("=")) {
    return pathMatch[1].trim().toUpperCase() || null;
  }

  // Plain transfer code (what we encode in the share QR today)
  const plain = trimmed.replace(/\s+/g, "").toUpperCase();
  if (/^TRF[-_A-Z0-9]+$/i.test(plain) || plain.length >= 6) {
    return plain;
  }

  return null;
}
