const KNOWN_LABELS: Record<string, string> = {
  RED_FLAGS: "Red flags",
  SYMPTOM: "Symptom",
  DURATION: "Duration",
  SEVERITY: "Severity",
  TRIGGER: "Trigger",
  BEHAVIOR: "Behavior",
  CONTEXT: "Context",
  NOTES: "Notes",
};

/** Humanize structured journal field keys from Milo trees (e.g. RED_FLAGS → Red flags). */
export function humanizeJournalFieldKey(key: string): string {
  const trimmed = key.trim();
  if (!trimmed) return "";
  const upper = trimmed.toUpperCase();
  if (KNOWN_LABELS[upper]) return KNOWN_LABELS[upper];
  if (upper === upper && !trimmed.includes("_") && !trimmed.includes(" ")) {
    return trimmed.charAt(0).toUpperCase() + trimmed.slice(1).toLowerCase();
  }
  return trimmed
    .replace(/_/g, " ")
    .toLowerCase()
    .replace(/\b\w/g, (c) => c.toUpperCase())
    .replace(/\bOf\b/g, "of")
    .replace(/\bAnd\b/g, "and");
}
