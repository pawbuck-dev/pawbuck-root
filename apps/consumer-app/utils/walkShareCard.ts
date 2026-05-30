import type { PawthonBadgeId } from "@/constants/pawthonBadges";
import { PAWTHON_BADGE_BY_ID } from "@/constants/pawthonBadges";
import {
  formatDurationWalk,
  formatMiles,
  formatPace,
  metersToMiles,
  paceMinPerMile,
} from "@/constants/pawthonUi";
import { WEEKLY_CHALLENGE_RANK_COPY_MIN_COHORT } from "@/services/walkMetrics";
import moment from "moment";

export type WalkShareCoord = { latitude: number; longitude: number };

/** Logical story card size (capture uses pixelRatio for ~1080×1920). */
export const WALK_SHARE_CARD_WIDTH = 360;
export const WALK_SHARE_CARD_HEIGHT = 640;
export const WALK_SHARE_CAPTURE_PIXEL_RATIO = 3;

export const WALK_SHARE_MAX_PATH_POINTS = 80;

export type WalkSharePayload = {
  petName: string;
  petPhotoUrl: string | null;
  path: WalkShareCoord[];
  distanceMeters: number;
  durationSec: number;
  endedAt: string;
  streakDays?: number;
  badgeId?: PawthonBadgeId;
  verificationPhotoUri?: string | null;
  weeklyRankLine?: string;
};

export type ProjectedPoint = { x: number; y: number };

/**
 * Normalize lat/lng into 0–1 box with aspect-ratio padding for SVG rendering.
 */
export function projectWalkPathToNormalizedPoints(
  path: WalkShareCoord[],
  maxPoints = WALK_SHARE_MAX_PATH_POINTS
): ProjectedPoint[] {
  if (path.length === 0) return [];

  const simplified =
    path.length <= maxPoints ? path : simplifyPathUniform(path, maxPoints);

  const lats = simplified.map((p) => p.latitude);
  const lngs = simplified.map((p) => p.longitude);
  const minLat = Math.min(...lats);
  const maxLat = Math.max(...lats);
  const minLng = Math.min(...lngs);
  const maxLng = Math.max(...lngs);

  let latSpan = maxLat - minLat;
  let lngSpan = maxLng - minLng;
  if (latSpan < 1e-6) latSpan = 1e-6;
  if (lngSpan < 1e-6) lngSpan = 1e-6;

  const pad = 0.08;
  const innerW = 1 - 2 * pad;
  const innerH = 1 - 2 * pad;

  const geoAspect = lngSpan / latSpan;
  const boxAspect = 1;
  let scaleX = innerW;
  let scaleY = innerH;
  let offsetX = pad;
  let offsetY = pad;

  if (geoAspect > boxAspect) {
    scaleY = innerW / geoAspect;
    offsetY = pad + (innerH - scaleY) / 2;
  } else {
    scaleX = innerH * geoAspect;
    offsetX = pad + (innerW - scaleX) / 2;
  }

  return simplified.map((p) => ({
    x: offsetX + ((p.longitude - minLng) / lngSpan) * scaleX,
    y: offsetY + (1 - (p.latitude - minLat) / latSpan) * scaleY,
  }));
}

function simplifyPathUniform(path: WalkShareCoord[], maxPoints: number): WalkShareCoord[] {
  if (path.length <= maxPoints) return path;
  const step = (path.length - 1) / (maxPoints - 1);
  const out: WalkShareCoord[] = [];
  for (let i = 0; i < maxPoints; i++) {
    const idx = Math.min(path.length - 1, Math.round(i * step));
    out.push(path[idx]);
  }
  return out;
}

export function projectedPointsToSvgPolyline(
  points: ProjectedPoint[],
  width: number,
  height: number
): string {
  if (points.length === 0) return "";
  return points.map((p) => `${p.x * width},${p.y * height}`).join(" ");
}

export function formatWalkShareDateLine(endedAt: string): string {
  const m = moment(endedAt);
  const now = moment();
  if (m.isSame(now, "day")) return `Today · ${m.format("h:mm A")}`;
  if (m.isSame(now.clone().subtract(1, "day"), "day")) return `Yesterday · ${m.format("h:mm A")}`;
  return m.format("ddd, MMM D · h:mm A");
}

export function buildWalkShareHighlightLine(payload: WalkSharePayload): string | null {
  if (payload.badgeId) {
    const badge = PAWTHON_BADGE_BY_ID[payload.badgeId];
    return badge ? `Badge unlocked: ${badge.name}` : null;
  }
  if (payload.streakDays != null && payload.streakDays >= 2) {
    return `${payload.streakDays}-day streak 🔥`;
  }
  if (payload.weeklyRankLine && shouldIncludeWeeklyRankOnShare(payload.weeklyRankLine)) {
    return payload.weeklyRankLine;
  }
  return null;
}

/** Omit noisy rank copy when cohort is still small. */
export function shouldIncludeWeeklyRankOnShare(rankLine: string): boolean {
  const match = rankLine.match(/#(\d+)\s+of\s+(\d+)/i);
  if (!match) return false;
  const total = Number(match[2]);
  return total >= WEEKLY_CHALLENGE_RANK_COPY_MIN_COHORT;
}

export function buildWalkShareCaption(payload: WalkSharePayload): string {
  const miles = metersToMiles(payload.distanceMeters);
  const pace = paceMinPerMile(payload.durationSec, miles);
  const lines: string[] = [
    `${payload.petName} and I just finished a Pawthon walk 🐾`,
    `${formatMiles(miles)} mi · ${formatDurationWalk(payload.durationSec)}${pace > 0 ? ` · ${formatPace(pace)}/mi pace` : ""}`,
  ];

  const highlight = buildWalkShareHighlightLine(payload);
  if (highlight) lines.push(highlight);

  lines.push("Track walks on PawBuck");
  return lines.join("\n");
}

export function buildWalkShareStats(payload: WalkSharePayload): {
  distance: string;
  duration: string;
  pace: string;
} {
  const miles = metersToMiles(payload.distanceMeters);
  const pace = paceMinPerMile(payload.durationSec, miles);
  return {
    distance: formatMiles(miles),
    duration: formatDurationWalk(payload.durationSec),
    pace: pace > 0 ? formatPace(pace) : "—",
  };
}

export function hasShareableRoute(path: WalkShareCoord[]): boolean {
  return path.length >= 2;
}
