/** Shared intent detection for Milo journal (offline fallback + triage). */

function normalize(s: string): string {
  return s.toLowerCase().trim();
}

/** Owner explicitly logging or tracking (not describing a problem). */
export function isLogIntentText(text: string): boolean {
  const h = normalize(text);
  return /\b(log|logged|logging|track|record)\b/.test(h);
}

export function isHydrationLogText(text: string): boolean {
  const h = normalize(text);
  if (h.includes("water") || h.includes("drink") || h.includes("hydrat")) return true;
  if (h.includes("glass") && !h.includes("food") && !h.includes("meal")) return true;
  return false;
}

export function isDietLogText(text: string): boolean {
  const h = normalize(text);
  if (h.includes("food") || h.includes("meal") || h.includes("bowl") || h.includes("bowls")) return true;
  if (/\bblows?\b/.test(h) && (h.includes("food") || h.includes("meal"))) return true;
  if (h.includes("fed") || h.includes("feeding") || h.includes("kibble") || h.includes("treat")) return true;
  if (h.includes("appetite") && isLogIntentText(h)) return true;
  if (isLogIntentText(h) && /\beat(ing)?\b/.test(h)) return true;
  return false;
}

/** Routine meal / water logging — not a symptom interview. */
export function isRoutineJournalLogText(text: string): boolean {
  if (isJournalCheckInStartText(text)) return false;
  if (isLogIntentText(text) && (isDietLogText(text) || isHydrationLogText(text))) return true;
  if (isHydrationLogText(text) && /\bglass(es)?\b/.test(normalize(text))) return true;
  return false;
}

/** Home “Check in with Milo” opener — not a symptom report. */
export function isJournalCheckInStartText(text: string): boolean {
  const h = normalize(text);
  if (!h) return false;
  return (
    h.includes("health check-in") ||
    h.includes("check-in for today") ||
    h.includes("starting today's check-in") ||
    h === "start_checkin"
  );
}
