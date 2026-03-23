import { haversineDistanceMeters } from "@/utils/haversine";

export type SimLatLng = { latitude: number; longitude: number };

/** Default start (Apple Park) when simulator has no fix. */
export const PAWTHON_SIM_DEFAULT_START: SimLatLng = {
  latitude: 37.3349,
  longitude: -122.00902,
};

/**
 * Move from a WGS84 point by `distanceM` meters at bearing (degrees clockwise from north).
 * Flat-earth approximation — fine for short simulator walks.
 */
export function offsetByMeters(from: SimLatLng, bearingDeg: number, distanceM: number): SimLatLng {
  const rad = (bearingDeg * Math.PI) / 180;
  const dNorth = distanceM * Math.cos(rad);
  const dEast = distanceM * Math.sin(rad);
  const dLat = dNorth / 111_320;
  const dLng = dEast / (111_320 * Math.cos((from.latitude * Math.PI) / 180));
  return {
    latitude: from.latitude + dLat,
    longitude: from.longitude + dLng,
  };
}

/**
 * Build coordinates along a straight-ish path totaling ~`totalMeters` (by segment steps).
 * `segmentCount` edges, each of length totalMeters/segmentCount.
 */
export function buildSimulatedWalkPath(
  start: SimLatLng,
  totalMeters: number,
  segmentCount: number,
  bearingDeg = 72
): SimLatLng[] {
  const step = totalMeters / segmentCount;
  const points: SimLatLng[] = [start];
  let cur = start;
  for (let i = 0; i < segmentCount; i++) {
    cur = offsetByMeters(cur, bearingDeg, step);
    points.push(cur);
  }
  return points;
}

/** Haversine sum of consecutive points (sanity check for dev). */
export function pathLengthMeters(path: SimLatLng[]): number {
  let t = 0;
  for (let i = 1; i < path.length; i++) {
    t += haversineDistanceMeters(path[i - 1]!, path[i]!);
  }
  return t;
}
