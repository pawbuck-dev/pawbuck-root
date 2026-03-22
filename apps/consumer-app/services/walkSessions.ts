import type { Json } from "@/database.types";
import { PAWTHON_STREAK_DAY_MIN_METERS } from "@/constants/pawthon";
import { supabase } from "@/utils/supabase";
import moment from "moment";

export type WalkPoint = { lat: number; lng: number; t: number };

export type WalkSessionRow = {
  id: string;
  user_id: string;
  pet_id: string;
  started_at: string;
  ended_at: string;
  distance_meters: number;
  duration_seconds: number;
  points: Json | null;
  created_at: string;
};

function startOfWeekUtcIso(): string {
  return moment().startOf("isoWeek").toISOString();
}

export async function insertWalkSession(params: {
  userId: string;
  petId: string;
  startedAt: Date;
  endedAt: Date;
  distanceMeters: number;
  durationSeconds: number;
  points: WalkPoint[];
}): Promise<{ id: string } | null> {
  const row = {
    user_id: params.userId,
    pet_id: params.petId,
    started_at: params.startedAt.toISOString(),
    ended_at: params.endedAt.toISOString(),
    distance_meters: Math.round(params.distanceMeters * 10) / 10,
    duration_seconds: Math.max(0, Math.floor(params.durationSeconds)),
    points: params.points.length > 0 ? (params.points as unknown as Json) : null,
  };

  const { data, error } = await supabase.from("walk_sessions").insert(row).select("id").single();

  if (error) {
    console.warn("[walkSessions] insert failed", error.message);
    return null;
  }
  return data ? { id: data.id as string } : null;
}

export async function fetchRecentWalkSessions(petId: string, limit = 20): Promise<WalkSessionRow[]> {
  const { data, error } = await supabase
    .from("walk_sessions")
    .select("*")
    .eq("pet_id", petId)
    .order("started_at", { ascending: false })
    .limit(limit);

  if (error) {
    console.warn("[walkSessions] fetch failed", error.message);
    return [];
  }
  return (data ?? []) as WalkSessionRow[];
}

/** Sum distance (km) for sessions for this pet since ISO week start (local week via moment isoWeek). */
export async function fetchWeekDistanceKmForPet(petId: string): Promise<number> {
  const since = startOfWeekUtcIso();
  const { data, error } = await supabase
    .from("walk_sessions")
    .select("distance_meters")
    .eq("pet_id", petId)
    .gte("ended_at", since);

  if (error || !data) return 0;
  const meters = data.reduce((acc, row) => acc + Number(row.distance_meters ?? 0), 0);
  return meters / 1000;
}

export type WalkSessionStreakSlice = Pick<WalkSessionRow, "ended_at" | "distance_meters">;

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

export async function fetchSessionsForStreak(
  petId: string,
  daysBack = 120
): Promise<WalkSessionStreakSlice[]> {
  const since = moment().subtract(daysBack, "days").toISOString();
  const { data, error } = await supabase
    .from("walk_sessions")
    .select("ended_at, distance_meters")
    .eq("pet_id", petId)
    .gte("ended_at", since);

  if (error || !data) return [];
  return data as WalkSessionStreakSlice[];
}

export async function fetchPawthonDashboardStats(petId: string): Promise<{ weekKm: number; streak: number }> {
  const [weekKm, sessions] = await Promise.all([
    fetchWeekDistanceKmForPet(petId),
    fetchSessionsForStreak(petId),
  ]);
  const streak = computeWalkingStreakFromSessions(sessions, PAWTHON_STREAK_DAY_MIN_METERS);
  return { weekKm, streak };
}
