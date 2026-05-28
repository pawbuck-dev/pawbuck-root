import { PAWTHON_STREAK_DAY_MIN_METERS } from "@/constants/pawthon";
import type { PawthonBadgeId } from "@/constants/pawthonBadges";
import { PAWTHON_BADGES } from "@/constants/pawthonBadges";
import type { WalkSessionRow } from "@/services/walkSessions";
import {
  fetchMyWeeklyWalkerRank,
  fetchRecentWalkSessionsForUser,
  fetchSessionsForStreak,
  fetchWeekWalkSessionsForPet,
} from "@/services/walkSessions";
import {
  computeWalkingStreakFromSessions,
  type WalkSessionStreakSlice,
} from "@/services/walkMetrics";
import AsyncStorage from "@react-native-async-storage/async-storage";
import moment from "moment";

const EARNED_KEY = "@pawbuck/pawthon_badges_earned_v1";

export type EarnedBadgeMap = Partial<Record<PawthonBadgeId, string>>;

export async function loadEarnedBadges(userId: string): Promise<EarnedBadgeMap> {
  try {
    const raw = await AsyncStorage.getItem(`${EARNED_KEY}:${userId}`);
    return raw ? (JSON.parse(raw) as EarnedBadgeMap) : {};
  } catch {
    return {};
  }
}

export async function saveEarnedBadges(userId: string, map: EarnedBadgeMap): Promise<void> {
  await AsyncStorage.setItem(`${EARNED_KEY}:${userId}`, JSON.stringify(map));
}

export type BadgeEvaluationContext = {
  userId: string;
  petId: string;
  allSessions: WalkSessionRow[];
  streakSessions: WalkSessionStreakSlice[];
  weekSessionsByPet: Map<string, WalkSessionRow[]>;
  hasVerificationPhoto: boolean;
  weeklyRank: number | null;
  goalMeters: number;
  previousEarned: EarnedBadgeMap;
};

export function evaluateNewBadges(ctx: BadgeEvaluationContext): PawthonBadgeId[] {
  const nowIso = new Date().toISOString();
  const newly: PawthonBadgeId[] = [];
  const earned = { ...ctx.previousEarned };

  const mark = (id: PawthonBadgeId) => {
    if (earned[id]) return;
    earned[id] = nowIso;
    newly.push(id);
  };

  const walkCount = ctx.allSessions.length;
  const streak = computeWalkingStreakFromSessions(ctx.streakSessions, PAWTHON_STREAK_DAY_MIN_METERS);
  const last = ctx.allSessions[0];

  if (walkCount >= 1) mark("first_walk");
  if (streak >= 3) mark("streak_3");
  if (streak >= 7) mark("streak_7");
  if (last && Number(last.distance_meters) >= 1609) mark("mile_one");
  if (walkCount >= 10) mark("walks_10");

  if (last) {
    const hour = moment(last.ended_at).hour();
    if (hour < 9) mark("morning");
  }

  if (last && walkCount >= 2) {
    const prev = ctx.allSessions[1];
    const gapDays = moment(last.ended_at).diff(moment(prev.ended_at), "days");
    if (gapDays >= 7) mark("comeback");
  }

  const petsThisWeek = new Set(
    [...ctx.weekSessionsByPet.values()].flat().map((s) => s.pet_id)
  );
  if (petsThisWeek.size >= 2) mark("multi_pet");

  const weekMeters = [...ctx.weekSessionsByPet.values()]
    .flat()
    .filter((s) => s.user_id === ctx.userId)
    .reduce((a, s) => a + Number(s.distance_meters), 0);
  if (weekMeters >= 1609 * 5) mark("week_5mi");

  if (ctx.hasVerificationPhoto) mark("photo");

  const goalDays = countGoalDaysInWeek(ctx.weekSessionsByPet.get(ctx.petId) ?? [], ctx.goalMeters);
  if (goalDays >= 5) mark("goal_week");

  if (ctx.weeklyRank != null && ctx.weeklyRank <= 10) mark("rank_top10");

  return newly;
}

function countGoalDaysInWeek(sessions: WalkSessionRow[], goalMeters: number): number {
  const byDay = new Map<string, number>();
  for (const s of sessions) {
    const day = moment(s.ended_at).format("YYYY-MM-DD");
    byDay.set(day, (byDay.get(day) ?? 0) + Number(s.distance_meters));
  }
  let count = 0;
  for (const m of byDay.values()) {
    if (m >= goalMeters) count += 1;
  }
  return count;
}

export function countEarnedBadges(map: EarnedBadgeMap): number {
  return PAWTHON_BADGES.filter((b) => map[b.id]).length;
}

export async function processBadgesAfterWalk(params: {
  userId: string;
  petId: string;
  hasVerificationPhoto: boolean;
  weeklyRank: number | null;
  goalMeters: number;
  pets: { id: string }[];
}): Promise<PawthonBadgeId[]> {
  const previousEarned = await loadEarnedBadges(params.userId);
  const [allSessions, streakSessions, weekByPet, rank] = await Promise.all([
    fetchRecentWalkSessionsForUser(params.userId, 200),
    fetchSessionsForStreak(params.petId),
    Promise.all(
      params.pets.map(async (p) => {
        const sessions = await fetchWeekWalkSessionsForPet(p.id);
        return [p.id, sessions] as const;
      })
    ).then((entries) => new Map(entries)),
    params.weeklyRank != null ? Promise.resolve(params.weeklyRank) : fetchMyWeeklyWalkerRank().then((r) => r.rank),
  ]);

  const newly = evaluateNewBadges({
    userId: params.userId,
    petId: params.petId,
    allSessions,
    streakSessions,
    weekSessionsByPet: weekByPet,
    hasVerificationPhoto: params.hasVerificationPhoto,
    weeklyRank: rank,
    goalMeters: params.goalMeters,
    previousEarned,
  });

  if (newly.length > 0) {
    const merged = { ...previousEarned };
    const now = new Date().toISOString();
    for (const id of newly) {
      merged[id] = now;
    }
    await saveEarnedBadges(params.userId, merged);
  }

  return newly;
}
