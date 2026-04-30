import { haversineDistanceKm, haversineDistanceMeters } from "@/utils/haversine";

describe("haversine", () => {
  it("returns 0 for identical points", () => {
    const p = { latitude: 40.7128, longitude: -74.006 };
    expect(haversineDistanceKm(p, p)).toBe(0);
    expect(haversineDistanceMeters(p, p)).toBe(0);
  });

  it("computes ~1 km for small offset", () => {
    const a = { latitude: 0, longitude: 0 };
    const b = { latitude: 0, longitude: 0.009 };
    const km = haversineDistanceKm(a, b);
    expect(km).toBeGreaterThan(0.9);
    expect(km).toBeLessThan(1.1);
    expect(haversineDistanceMeters(a, b)).toBeCloseTo(km * 1000, 5);
  });
});
