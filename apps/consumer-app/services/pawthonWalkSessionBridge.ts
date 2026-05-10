import { PAWTHON_MAX_POINTS_PER_SESSION, PAWTHON_MIN_SEGMENT_METERS } from "@/constants/pawthon";
import type { WalkPoint } from "@/services/walkSessions";
import {
  createWalkGpsPipelineState,
  processWalkGpsSample,
  type WalkGpsPipelineState,
} from "@/services/walkGpsPipeline";
type MapCoord = { latitude: number; longitude: number };

type Listener = () => void;

const listeners = new Set<Listener>();

let active = false;
let pipeline: WalkGpsPipelineState = createWalkGpsPipelineState();
let pathCoords: MapCoord[] = [];
let points: WalkPoint[] = [];
let distanceM = 0;
let lastLatLng: { latitude: number; longitude: number } | null = null;

export function subscribePawthonWalkSession(listener: Listener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

function emit(): void {
  listeners.forEach((l) => l());
}

export function resetPawthonWalkSessionBridge(): void {
  active = true;
  pipeline = createWalkGpsPipelineState();
  pathCoords = [];
  points = [];
  distanceM = 0;
  lastLatLng = null;
  emit();
}

export function deactivatePawthonWalkSessionBridge(): void {
  active = false;
}

/** Add distance from pedometer gap-fill (no new map vertex). */
export function appendPawthonWalkGapMeters(meters: number): void {
  if (!active || !Number.isFinite(meters) || meters <= 0) return;
  const capped = Math.min(meters, 200);
  distanceM += capped;
  emit();
}

export function isPawthonWalkSessionActive(): boolean {
  return active;
}

export function getPawthonWalkSnapshot(): {
  pathCoords: MapCoord[];
  points: WalkPoint[];
  distanceM: number;
  lastLatLng: { latitude: number; longitude: number } | null;
} {
  return {
    pathCoords: [...pathCoords],
    points: [...points],
    distanceM,
    lastLatLng: lastLatLng ? { ...lastLatLng } : null,
  };
}

/** Apply one location sample (foreground or background task). Returns false if rejected by pipeline. */
export function ingestWalkLocationSample(input: {
  latitude: number;
  longitude: number;
  timestampMs: number;
  accuracy: number | null;
}): boolean {
  if (!active) return false;

  const nowMs = Date.now();
  const result = processWalkGpsSample(pipeline, input, nowMs);
  if (!result.accepted) return false;

  const { smoothed, segmentMetersFromPrevious } = result;
  if (lastLatLng && segmentMetersFromPrevious < PAWTHON_MIN_SEGMENT_METERS) {
    return false;
  }

  pipeline = result.state;

  lastLatLng = { latitude: smoothed.latitude, longitude: smoothed.longitude };
  pathCoords = [...pathCoords, { latitude: smoothed.latitude, longitude: smoothed.longitude }];
  if (points.length < PAWTHON_MAX_POINTS_PER_SESSION) {
    points.push({
      lat: smoothed.latitude,
      lng: smoothed.longitude,
      t: smoothed.t,
    });
  }
  distanceM += segmentMetersFromPrevious;
  emit();
  return true;
}
