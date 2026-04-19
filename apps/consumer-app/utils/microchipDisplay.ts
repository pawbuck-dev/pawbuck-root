/**
 * Format microchip for display (e.g. 15-digit ISO → grouped segments).
 */
export function formatMicrochipDisplay(raw: string | null | undefined): string {
  if (!raw?.trim()) return "—";
  const digits = raw.replace(/\D/g, "");
  if (digits.length === 15) {
    return `${digits.slice(0, 3)}-${digits.slice(3, 6)}-${digits.slice(6, 9)}-${digits.slice(9, 12)}-${digits.slice(12, 15)}`;
  }
  return raw.trim();
}
