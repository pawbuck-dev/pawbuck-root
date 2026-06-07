/** User-facing summary when Milo journal API fails and offline flow takes over. */
export function formatJournalFallbackReason(reason: string | undefined): string {
  if (!reason?.trim()) return "server error";
  const r = reason.trim();
  if (r.includes("weight_value")) {
    return "couldn't read pet weight from your profile";
  }
  if (r.includes("validation errors") || r.includes("Validation errors")) {
    return "server validation error";
  }
  if (r.startsWith("{") || r.length > 160) {
    return "server error";
  }
  return r;
}
