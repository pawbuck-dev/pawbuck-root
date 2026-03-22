/** Earth mean radius (km). */
const R_KM = 6371;

function toRad(deg: number): number {
  return (deg * Math.PI) / 180;
}

/**
 * Great-circle distance between two WGS84 points (km).
 */
export function haversineDistanceKm(
  a: { latitude: number; longitude: number },
  b: { latitude: number; longitude: number }
): number {
  const dLat = toRad(b.latitude - a.latitude);
  const dLon = toRad(b.longitude - a.longitude);
  const lat1 = toRad(a.latitude);
  const lat2 = toRad(b.latitude);
  const h =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
  return R_KM * c;
}

/** Distance in meters (for GPS walk segments). */
export function haversineDistanceMeters(
  a: { latitude: number; longitude: number },
  b: { latitude: number; longitude: number }
): number {
  return haversineDistanceKm(a, b) * 1000;
}
