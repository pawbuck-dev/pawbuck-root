import type { CareNudge } from "./types";

export function rankCareNudges(nudges: CareNudge[]): CareNudge[] {
  return [...nudges].sort((a, b) => {
    if (a.priority !== b.priority) return a.priority - b.priority;
    return a.dedupeKey.localeCompare(b.dedupeKey);
  });
}

export function capCareNudges(nudges: CareNudge[], max: number): CareNudge[] {
  return rankCareNudges(nudges).slice(0, Math.max(0, max));
}

export function filterPushEligiblePhaseB(nudges: CareNudge[]): CareNudge[] {
  const pushKinds = new Set([
    "vac_overdue",
    "vet_appt_24h",
    "vet_appt_1h",
    "doc_expiry",
    "senior_mobility_tip",
  ]);
  return nudges.filter((n) => pushKinds.has(n.kind) && n.channels.includes("push"));
}

export type DigestPushPayload = {
  title: string;
  body: string;
  dedupeKey: string;
  nudgeCount: number;
  data: Record<string, string>;
};

/** One daily digest summarizing all pets (reviewer decision). */
export function buildDailyDigestPush(
  nudges: CareNudge[],
  userId: string,
  now: Date = new Date()
): DigestPushPayload | null {
  const pushNudges = filterPushEligiblePhaseB(nudges);
  if (pushNudges.length === 0) return null;

  const ranked = rankCareNudges(pushNudges);
  const dateKey = now.toISOString().slice(0, 10);
  const dedupeKey = `digest:${userId}:${dateKey}`;

  const petNames = [...new Set(ranked.map((n) => n.petName).filter(Boolean))] as string[];
  const petLabel =
    petNames.length === 0
      ? "your pets"
      : petNames.length === 1
        ? petNames[0]!
        : `${petNames.length} pets`;

  const top = ranked.slice(0, 3);
  const lines = top.map((n) => {
    const prefix = n.petName && petNames.length > 1 ? `${n.petName}: ` : "";
    return `${prefix}${n.title}`;
  });

  const more = ranked.length > 3 ? ` +${ranked.length - 3} more` : "";
  const body = `${lines.join(" · ")}${more}. Tap to review in PawBuck.`;

  return {
    title: `Care reminders for ${petLabel}`,
    body: body.length > 240 ? `${body.slice(0, 237)}…` : body,
    dedupeKey,
    nudgeCount: ranked.length,
    data: {
      notificationKind: "care_nudge_digest",
      url: "/(home)",
      nudgeCount: String(ranked.length),
    },
  };
}
