import { formatDurationWalk, formatMiles, metersToMiles, paceMinPerMile, formatPace } from "@/constants/pawthonUi";
import type { WalkSessionRow } from "@/services/walkSessions";
import moment from "moment";

export function formatWalkLogDate(startedAt: string): string {
  const m = moment(startedAt);
  const now = moment();
  if (m.isSame(now, "day")) return `Today · ${m.format("h:mm A")}`;
  if (m.isSame(now.clone().subtract(1, "day"), "day")) return `Yesterday · ${m.format("h:mm A")}`;
  return m.format("ddd, MMM D · h:mm A");
}

export function formatLastWalkKicker(endedAt: string): string {
  const m = moment(endedAt);
  const now = moment();
  if (m.isSame(now, "day")) return `LAST WALK · Today ${m.format("h:mm A")}`;
  if (m.isSame(now.clone().subtract(1, "day"), "day")) return `LAST WALK · Yesterday ${m.format("h:mm A")}`;
  return `LAST WALK · ${m.format("ddd h:mm A")}`;
}

export function formatWalkDistanceDuration(session: WalkSessionRow): string {
  const mi = formatMiles(metersToMiles(Number(session.distance_meters)));
  const dur = formatDurationWalk(session.duration_seconds);
  return `${mi} mi · ${dur}`;
}

export function formatWalkPace(session: WalkSessionRow): string | null {
  const miles = metersToMiles(Number(session.distance_meters));
  const pace = paceMinPerMile(session.duration_seconds, miles);
  if (pace <= 0) return null;
  return formatPace(pace);
}

export function parseWalkPoints(session: WalkSessionRow): { latitude: number; longitude: number }[] {
  if (!session.points || !Array.isArray(session.points)) return [];
  return (session.points as { lat: number; lng: number }[])
    .filter((p) => typeof p.lat === "number" && typeof p.lng === "number")
    .map((p) => ({ latitude: p.lat, longitude: p.lng }));
}
