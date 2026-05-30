/** Public verify paths (v1: static links in PDFs; live status is a follow-up). */
export const PAWBUCK_PUBLIC_ORIGIN = "https://pawbuck.app";

export function petPassportVerifyPath(emailLocalPart: string): string {
  const slug = emailLocalPart.trim().toLowerCase() || "pet";
  return `${PAWBUCK_PUBLIC_ORIGIN}/p/${encodeURIComponent(slug)}`;
}

export function vetSummaryVerifyPath(emailLocalPart: string): string {
  const slug = emailLocalPart.trim().toLowerCase() || "pet";
  return `${PAWBUCK_PUBLIC_ORIGIN}/v/${encodeURIComponent(slug)}`;
}
