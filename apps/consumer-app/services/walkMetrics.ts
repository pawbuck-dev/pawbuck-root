import { WEEKLY_CHALLENGE_MIN_APP_USERS, WEEKLY_CHALLENGE_MIN_COUNTRY_USERS } from "@/constants/pawthon";
import moment from "moment";

/** Minimal session fields for streak aggregation (pure logic tests). */
export type WalkSessionStreakSlice = {
  ended_at: string;
  distance_meters: number;
};

/**
 * Walking streak: consecutive local calendar days with at least `minMetersPerDay` total for this pet.
 * If today is not yet a qualifying day, counting starts from yesterday so an in-progress day does not break the streak.
 */
export function computeWalkingStreakFromSessions(
  sessions: WalkSessionStreakSlice[],
  minMetersPerDay: number
): number {
  const byDay = new Map<string, number>();
  for (const s of sessions) {
    const day = moment(s.ended_at).format("YYYY-MM-DD");
    byDay.set(day, (byDay.get(day) ?? 0) + Number(s.distance_meters ?? 0));
  }

  const qualifies = (key: string) => (byDay.get(key) ?? 0) >= minMetersPerDay;

  let cursor = moment().startOf("day");
  if (!qualifies(cursor.format("YYYY-MM-DD"))) {
    cursor = cursor.clone().subtract(1, "day");
  }

  let streak = 0;
  for (let i = 0; i < 400; i++) {
    const key = cursor.format("YYYY-MM-DD");
    if (qualifies(key)) {
      streak += 1;
      cursor = cursor.clone().subtract(1, "day");
    } else {
      break;
    }
  }
  return streak;
}

/** Hub + dark dashboard weekly walker copy. */
export function formatWeeklyWalkerRankLine(
  rank: number | null | undefined,
  total: number | undefined
): string {
  const t = total ?? 0;
  if (t <= 0) return "Be the first walker this week";
  if (rank != null) return `#${rank} of ${t} walkers`;
  return `${t} walkers this week · start a walk to rank`;
}

/** Minimum cohort size before showing competitive “#n of m … ahead of you” copy (avoids “#1 of 1”). */
export const WEEKLY_CHALLENGE_RANK_COPY_MIN_COHORT = 100;

/** Weekly challenge entry points when app has enough users (legacy global gate). */
export function isWeeklyChallengeEnabled(appRegisteredUserCount: number): boolean {
  return appRegisteredUserCount > WEEKLY_CHALLENGE_MIN_APP_USERS;
}

/** Weekly challenge when enough pet owners in the same country as the selected pet. */
export function isWeeklyChallengeEnabledForCountry(countryUserCount: number): boolean {
  return countryUserCount > WEEKLY_CHALLENGE_MIN_COUNTRY_USERS;
}

/** Light dashboard weekly challenge (Figma) — pet parents + 👀. */
export function formatWeeklyChallengeFigmaLine(
  rank: number | null | undefined,
  total: number | undefined
): string {
  const t = total ?? 0;
  if (t <= 0) return "Be the first pet parent this week 👀";
  if (t < WEEKLY_CHALLENGE_RANK_COPY_MIN_COHORT) {
    const parentLabel = t === 1 ? "pet parent" : "pet parents";
    return `${t} ${parentLabel} in your area this week · keep walking — rankings unlock when your local group grows 👀`;
  }
  if (rank != null) return `#${rank} of ${t} pet parents are ahead of you 👀`;
  return `${t} pet parents this week · start a walk to rank 👀`;
}
