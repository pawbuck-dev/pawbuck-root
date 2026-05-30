import {
  buildWalkShareCaption,
  buildWalkShareHighlightLine,
  projectWalkPathToNormalizedPoints,
  shouldIncludeWeeklyRankOnShare,
  WALK_SHARE_MAX_PATH_POINTS,
} from "@/utils/walkShareCard";

describe("walkShareCard", () => {
  describe("projectWalkPathToNormalizedPoints", () => {
    it("returns empty for no path", () => {
      expect(projectWalkPathToNormalizedPoints([])).toEqual([]);
    });

    it("returns one point in padded box for single coordinate", () => {
      const pts = projectWalkPathToNormalizedPoints([
        { latitude: 49.28, longitude: -123.12 },
      ]);
      expect(pts).toHaveLength(1);
      expect(pts[0].x).toBeGreaterThanOrEqual(0);
      expect(pts[0].x).toBeLessThanOrEqual(1);
      expect(pts[0].y).toBeGreaterThanOrEqual(0);
      expect(pts[0].y).toBeLessThanOrEqual(1);
    });

    it("preserves start and end for a line path", () => {
      const path = [
        { latitude: 0, longitude: 0 },
        { latitude: 0, longitude: 1 },
        { latitude: 1, longitude: 1 },
      ];
      const pts = projectWalkPathToNormalizedPoints(path);
      expect(pts[0].x).toBeLessThan(pts[pts.length - 1].x);
    });

    it("simplifies long paths", () => {
      const path = Array.from({ length: 200 }, (_, i) => ({
        latitude: 49 + i * 0.0001,
        longitude: -123 + i * 0.0001,
      }));
      const pts = projectWalkPathToNormalizedPoints(path);
      expect(pts.length).toBeLessThanOrEqual(WALK_SHARE_MAX_PATH_POINTS);
    });
  });

  describe("buildWalkShareCaption", () => {
    it("includes pet name, stats, and footer", () => {
      const caption = buildWalkShareCaption({
        petName: "Luna",
        petPhotoUrl: null,
        path: [],
        distanceMeters: 805,
        durationSec: 900,
        endedAt: new Date().toISOString(),
      });
      expect(caption).toContain("Luna");
      expect(caption).toContain("mi ·");
      expect(caption).toContain("Track walks on PawBuck");
    });

    it("includes streak when >= 2 days", () => {
      const caption = buildWalkShareCaption({
        petName: "Max",
        petPhotoUrl: null,
        path: [],
        distanceMeters: 500,
        durationSec: 600,
        endedAt: new Date().toISOString(),
        streakDays: 5,
      });
      expect(caption).toContain("5-day streak");
    });
  });

  describe("buildWalkShareHighlightLine", () => {
    it("prefers badge over streak", () => {
      const line = buildWalkShareHighlightLine({
        petName: "Luna",
        petPhotoUrl: null,
        path: [],
        distanceMeters: 100,
        durationSec: 60,
        endedAt: new Date().toISOString(),
        streakDays: 7,
        badgeId: "first_walk",
      });
      expect(line).toContain("First steps");
    });
  });

  describe("shouldIncludeWeeklyRankOnShare", () => {
    it("includes rank when cohort is large enough", () => {
      expect(shouldIncludeWeeklyRankOnShare("#8 of 150 walkers")).toBe(true);
    });

    it("excludes rank when cohort is small", () => {
      expect(shouldIncludeWeeklyRankOnShare("#1 of 12 walkers")).toBe(false);
    });
  });
});
