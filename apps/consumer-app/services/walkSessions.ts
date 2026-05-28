import type { Json } from "@/database.types";
import { PAWTHON_STREAK_DAY_MIN_METERS } from "@/constants/pawthon";
import { supabase } from "@/utils/supabase";
import moment from "moment";

import type { WalkSessionStreakSlice } from "@/services/walkMetrics";
import {
  computeWalkingStreakFromSessions,
  formatWeeklyChallengeFigmaLine,
  formatWeeklyWalkerRankLine,
} from "@/services/walkMetrics";

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
    .order("ended_at", { ascending: false })
    .limit(limit);

  if (error) {
    console.warn("[walkSessions] fetch failed", error.message);
    return [];
  }
  return (data ?? []) as WalkSessionRow[];
}

export async function fetchWalkSessionById(sessionId: string): Promise<WalkSessionRow | null> {
  const { data, error } = await supabase.from("walk_sessions").select("*").eq("id", sessionId).maybeSingle();

  if (error) {
    console.warn("[walkSessions] fetch by id failed", error.message);
    return null;
  }
  return (data ?? null) as WalkSessionRow | null;
}

/** Sum distance for sessions ending on the local calendar day. */
export async function fetchTodayDistanceMetersForPet(petId: string): Promise<number> {
  const start = moment().startOf("day").toISOString();
  const end = moment().endOf("day").toISOString();
  const { data, error } = await supabase
    .from("walk_sessions")
    .select("distance_meters")
    .eq("pet_id", petId)
    .gte("ended_at", start)
    .lte("ended_at", end);

  if (error || !data) return 0;
  return data.reduce((acc, row) => acc + Number(row.distance_meters ?? 0), 0);
}

export async function fetchRecentWalkSessionsForUser(userId: string, limit = 200): Promise<WalkSessionRow[]> {
  const { data, error } = await supabase
    .from("walk_sessions")
    .select("*")
    .eq("user_id", userId)
    .order("ended_at", { ascending: false })
    .limit(limit);

  if (error) {
    console.warn("[walkSessions] user fetch failed", error.message);
    return [];
  }
  return (data ?? []) as WalkSessionRow[];
}

export async function fetchWeekWalkSessionsForPet(petId: string): Promise<WalkSessionRow[]> {
  const since = startOfWeekUtcIso();
  const { data, error } = await supabase
    .from("walk_sessions")
    .select("*")
    .eq("pet_id", petId)
    .gte("ended_at", since)
    .order("ended_at", { ascending: false });

  if (error) {
    console.warn("[walkSessions] week fetch failed", error.message);
    return [];
  }
  return (data ?? []) as WalkSessionRow[];
}

export type PawthonDailyStats = {
  todayMeters: number;
  weekKm: number;
  streak: number;
  goalMeters: number;
};

export async function fetchPawthonDailyStats(
  petId: string,
  goalMeters: number
): Promise<PawthonDailyStats> {
  const [todayMeters, dash] = await Promise.all([
    fetchTodayDistanceMetersForPet(petId),
    fetchPawthonDashboardStats(petId),
  ]);
  return {
    todayMeters,
    weekKm: dash.weekKm,
    streak: dash.streak,
    goalMeters,
  };
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

export type { WalkSessionStreakSlice };
export {
  computeWalkingStreakFromSessions,
  formatWeeklyChallengeFigmaLine,
  formatWeeklyWalkerRankLine,
  isWeeklyChallengeEnabled,
} from "./walkMetrics";

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

/** All-time walks + total distance for hub stats (client-side sum; fine for typical history sizes). */
export async function fetchLifetimeWalkAggregatesForPet(
  petId: string
): Promise<{ walkCount: number; totalMeters: number }> {
  const { data, error } = await supabase.from("walk_sessions").select("distance_meters").eq("pet_id", petId);

  if (error || !data) return { walkCount: 0, totalMeters: 0 };
  const walkCount = data.length;
  const totalMeters = data.reduce((acc, row) => acc + Number(row.distance_meters ?? 0), 0);
  return { walkCount, totalMeters };
}

/** Registered auth users (for weekly challenge visibility gate). */
export async function fetchAppRegisteredUserCount(): Promise<number> {
  const { data, error } = await supabase.rpc("app_registered_user_count");

  if (error) {
    console.warn("[walkSessions] app_registered_user_count", error.message);
    return 0;
  }

  const n = typeof data === "number" ? data : Number(data ?? 0);
  return Number.isFinite(n) ? n : 0;
}

/** Pet owners with at least one pet in this country (pets.country display name). */
export async function fetchAppRegisteredUserCountForCountry(country: string): Promise<number> {
  const trimmed = country?.trim() ?? "";
  if (!trimmed) return 0;

  const { data, error } = await supabase.rpc("app_registered_user_count_for_country", {
    p_country: trimmed,
  });

  if (error) {
    console.warn("[walkSessions] app_registered_user_count_for_country", error.message);
    return 0;
  }

  const n = typeof data === "number" ? data : Number(data ?? 0);
  return Number.isFinite(n) ? n : 0;
}

function parseWeeklyWalkerRankRow(data: unknown): { rank: number | null; total: number } {
  const row = Array.isArray(data) ? data[0] : data;
  if (!row || typeof row !== "object") {
    return { rank: null, total: 0 };
  }
  const r = row as { rank: number | null; total: number | null };
  return {
    rank: r.rank != null ? Number(r.rank) : null,
    total: Number(r.total ?? 0),
  };
}

/** Leaderboard row for dashboard / hub (#rank of total walkers this UTC ISO week, global). */
export async function fetchMyWeeklyWalkerRank(): Promise<{ rank: number | null; total: number }> {
  const { data, error } = await supabase.rpc("pawthon_my_weekly_walker_rank");

  if (error) {
    console.warn("[walkSessions] pawthon_my_weekly_walker_rank", error.message);
    return { rank: null, total: 0 };
  }

  return parseWeeklyWalkerRankRow(data);
}

/** Same as {@link fetchMyWeeklyWalkerRank} but cohort = pet owners in `country`. */
export async function fetchMyWeeklyWalkerRankForCountry(
  country: string
): Promise<{ rank: number | null; total: number }> {
  const trimmed = country?.trim() ?? "";
  if (!trimmed) return { rank: null, total: 0 };

  const { data, error } = await supabase.rpc("pawthon_my_weekly_walker_rank_for_country", {
    p_country: trimmed,
  });

  if (error) {
    console.warn("[walkSessions] pawthon_my_weekly_walker_rank_for_country", error.message);
    return { rank: null, total: 0 };
  }

  return parseWeeklyWalkerRankRow(data);
}

export async function fetchPawthonHubStats(petId: string): Promise<{
  walkCount: number;
  totalMiles: number;
  weekKm: number;
  streak: number;
}> {
  const [aggregates, dash] = await Promise.all([
    fetchLifetimeWalkAggregatesForPet(petId),
    fetchPawthonDashboardStats(petId),
  ]);
  return {
    walkCount: aggregates.walkCount,
    totalMiles: aggregates.totalMeters / 1609.344,
    weekKm: dash.weekKm,
    streak: dash.streak,
  };
}
