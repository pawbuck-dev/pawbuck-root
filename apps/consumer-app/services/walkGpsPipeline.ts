import { haversineDistanceMeters } from "@/utils/haversine";

/** Reject fixes with horizontal uncertainty above this (meters). */
export const WALK_GPS_MAX_HORIZONTAL_ACCURACY_M = 20;

/** Reject fixes whose reported epoch is this much older than `nowMs` (stale/cached). */
export const WALK_GPS_MAX_STALE_MS = 5000;

/** Reject segment if implied speed exceeds this (walking / running). */
export const WALK_GPS_MAX_SPEED_KMH = 30;

const SMOOTH_WINDOW = 5;

export type WalkGpsSample = {
  latitude: number;
  longitude: number;
  t: number;
  /** Meters; use a small default when unknown so urban fixes are not all dropped. */
  accuracyM: number;
};

export type WalkGpsPipelineState = {
  lastAcceptedRaw: WalkGpsSample | null;
  /** Last up to 5 accepted raw points for moving average of drawn path. */
  smoothLat: number[];
  smoothLng: number[];
};

export function createWalkGpsPipelineState(): WalkGpsPipelineState {
  return { lastAcceptedRaw: null, smoothLat: [], smoothLng: [] };
}

function impliedSpeedKmh(
  a: { latitude: number; longitude: number },
  b: { latitude: number; longitude: number },
  dtSec: number
): number {
  if (dtSec <= 0) return Number.POSITIVE_INFINITY;
  const m = haversineDistanceMeters(a, b);
  return m / 1000 / (dtSec / 3600);
}

function movingAverage(values: number[]): number {
  if (values.length === 0) return 0;
  return values.reduce((s, v) => s + v, 0) / values.length;
}

export type WalkGpsProcessResult =
  | { accepted: false; reason: string; state: WalkGpsPipelineState }
  | {
      accepted: true;
      state: WalkGpsPipelineState;
      /** Smoothed point to append to polyline and walk points. */
      smoothed: WalkGpsSample;
      /** Straight-line meters from previous smoothed output (for distance). */
      segmentMetersFromPrevious: number;
    };

/**
 * Filters raw GPS, rejects impossible speeds vs last accepted raw fix, then 5-point moving average on accepted raw coords.
 */
export function processWalkGpsSample(
  state: WalkGpsPipelineState,
  input: {
    latitude: number;
    longitude: number;
    timestampMs: number;
    accuracy: number | null;
  },
  nowMs: number
): WalkGpsProcessResult {
  const accuracyM =
    input.accuracy != null && Number.isFinite(input.accuracy) && input.accuracy > 0
      ? input.accuracy
      : 15;

  if (accuracyM > WALK_GPS_MAX_HORIZONTAL_ACCURACY_M) {
    return { accepted: false, reason: "accuracy", state };
  }

  const stale = nowMs - input.timestampMs;
  if (stale > WALK_GPS_MAX_STALE_MS || stale < -2000) {
    return { accepted: false, reason: "stale", state };
  }

  const raw: WalkGpsSample = {
    latitude: input.latitude,
    longitude: input.longitude,
    t: input.timestampMs,
    accuracyM,
  };

  if (state.lastAcceptedRaw) {
    const dtSec = (raw.t - state.lastAcceptedRaw.t) / 1000;
    const v = impliedSpeedKmh(state.lastAcceptedRaw, raw, dtSec);
    if (v > WALK_GPS_MAX_SPEED_KMH) {
      return { accepted: false, reason: "speed", state };
    }
  }

  const nextSmoothLat = [...state.smoothLat, raw.latitude].slice(-SMOOTH_WINDOW);
  const nextSmoothLng = [...state.smoothLng, raw.longitude].slice(-SMOOTH_WINDOW);
  const latOut = movingAverage(nextSmoothLat);
  const lngOut = movingAverage(nextSmoothLng);

  const prevSmoothed =
    state.smoothLat.length > 0
      ? {
          latitude: movingAverage(state.smoothLat),
          longitude: movingAverage(state.smoothLng),
        }
      : null;

  const segmentMetersFromPrevious = prevSmoothed
    ? haversineDistanceMeters(prevSmoothed, { latitude: latOut, longitude: lngOut })
    : 0;

  const nextState: WalkGpsPipelineState = {
    lastAcceptedRaw: raw,
    smoothLat: nextSmoothLat,
    smoothLng: nextSmoothLng,
  };

  return {
    accepted: true,
    state: nextState,
    smoothed: { latitude: latOut, longitude: lngOut, t: raw.t, accuracyM },
    segmentMetersFromPrevious,
  };
}
