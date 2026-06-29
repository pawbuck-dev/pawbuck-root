export type CareNudgeDismissalRow = {
  pet_id: string;
  nudge_kind: string;
  dismissed_until: string | null;
};

export function isDismissalActive(
  dismissal: CareNudgeDismissalRow,
  todayYmd: string
): boolean {
  if (!dismissal.dismissed_until) return true;
  return dismissal.dismissed_until >= todayYmd;
}

/** Filter nudges suppressed by owner dismiss/snooze rows. */
export function applyDismissals<T extends { kind: string; petId: string }>(
  nudges: readonly T[],
  dismissals: readonly CareNudgeDismissalRow[],
  todayYmd: string
): T[] {
  const blocked = new Set<string>();
  for (const row of dismissals) {
    if (!isDismissalActive(row, todayYmd)) continue;
    blocked.add(`${row.pet_id}:${row.nudge_kind}`);
  }
  return nudges.filter((n) => !blocked.has(`${n.petId}:${n.kind}`));
}

/** Default snooze duration for in-app dismiss (7 days). */
export function snoozeUntilYmd(from: Date, days = 7): string {
  const d = new Date(from);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}
