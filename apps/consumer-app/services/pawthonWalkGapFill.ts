import { appendPawthonWalkGapMeters, ingestWalkLocationSample } from "@/services/pawthonWalkSessionBridge";
import { haversineDistanceMeters } from "@/utils/haversine";

/** Gap-fill uses `Pedometer.getStepCountAsync` (works when the app wakes with new fixes). `watchStepCount` does not fire in background per Expo. */
type LatLng = { latitude: number; longitude: number };

let lastFix: { coords: LatLng; timestamp: number } | null = null;

export function resetPawthonGapAnchor(): void {
  lastFix = null;
}

const GAP_MS = 8000;
const STRIDE_M = 0.72;

/**
 * When two GPS fixes are far apart in time, add conservative distance from pedometer (iOS getStepCountAsync).
 * Caps by straight-line × 1.2 so we never overshoot wildly. No-op on failure / Android if unavailable.
 */
export async function maybeAppendGapFillFromPedometer(
  prev: { coords: LatLng; timestamp: number },
  next: { coords: LatLng; timestamp: number }
): Promise<void> {
  const dt = next.timestamp - prev.timestamp;
  if (dt < GAP_MS) return;


  try {
    const { Pedometer } = await import("expo-sensors");
    const avail = await Pedometer.isAvailableAsync();
    if (!avail) return;
    const perm = await Pedometer.getPermissionsAsync();
    if (perm.status !== "granted") return;

    const start = new Date(prev.timestamp);
    const end = new Date(next.timestamp);
    const { steps } = await Pedometer.getStepCountAsync(start, end);
    if (steps <= 0) return;

    const fromSteps = steps * STRIDE_M;
    const straight = haversineDistanceMeters(prev.coords, next.coords);
    const cap = Math.max(straight * 1.2, 10);
    const gapMeters = Math.min(fromSteps, cap);
    appendPawthonWalkGapMeters(gapMeters);
  } catch {
    /* pedometer unavailable or query failed */
  }
}

/**
 * Chain-aware ingest: pedometer gap-fill between this fix and the previous one, then GPS pipeline.
 */
export async function ingestWalkLocationWithGapChain(loc: {
  coords: { latitude: number; longitude: number; accuracy: number | null };
  timestamp: number;
}): Promise<void> {
  const next = { coords: loc.coords, timestamp: loc.timestamp };
  if (lastFix) {
    await maybeAppendGapFillFromPedometer(lastFix, next);
  }
  lastFix = next;
  ingestWalkLocationSample({
    latitude: loc.coords.latitude,
    longitude: loc.coords.longitude,
    timestampMs: loc.timestamp,
    accuracy: loc.coords.accuracy,
  });
}
