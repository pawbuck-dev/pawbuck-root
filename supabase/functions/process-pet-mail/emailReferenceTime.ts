/**
 * Reference calendar year for NLP appointment extraction from email prose.
 */
export function resolveEmailReferenceYear(emailDateIso: string | null | undefined): number {
  if (emailDateIso) {
    const parsed = new Date(emailDateIso);
    const y = parsed.getUTCFullYear();
    if (!Number.isNaN(parsed.getTime()) && y >= 2000 && y <= 2100) {
      return y;
    }
  }
  return new Date().getUTCFullYear();
}
