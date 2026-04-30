let mockFrom: jest.Mock;
let mockRpc: jest.Mock;

jest.mock("@/utils/supabase", () => {
  mockFrom = jest.fn();
  mockRpc = jest.fn();
  return {
    supabase: {
      from: (...a: unknown[]) => mockFrom(...a),
      rpc: (...a: unknown[]) => mockRpc(...a),
    },
  };
});

import {
  fetchLifetimeWalkAggregatesForPet,
  fetchMyWeeklyWalkerRank,
  fetchRecentWalkSessions,
  fetchSessionsForStreak,
  fetchWeekDistanceKmForPet,
  insertWalkSession,
} from "@/services/walkSessions";

function chainInsertSingle(result: { data: { id: string } | null; error: Error | null }) {
  const single = jest.fn().mockResolvedValue(result);
  const select = jest.fn().mockReturnValue({ single });
  const insert = jest.fn().mockReturnValue({ select });
  return insert;
}

function chainSelectEqOrderLimit(result: { data: unknown; error: Error | null }) {
  const limit = jest.fn().mockResolvedValue(result);
  const order = jest.fn().mockReturnValue({ limit });
  const eq = jest.fn().mockReturnValue({ order });
  const select = jest.fn().mockReturnValue({ eq });
  return { select, eq, order, limit };
}

function chainSelectEqGte(result: { data: unknown; error: Error | null }) {
  const gte = jest.fn().mockResolvedValue(result);
  const eq = jest.fn().mockReturnValue({ gte });
  const select = jest.fn().mockReturnValue({ eq });
  return { select, eq, gte };
}

describe("walkSessions service", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("insertWalkSession", () => {
    it("inserts rounded distance and null points when empty", async () => {
      const insert = chainInsertSingle({ data: { id: "walk-1" }, error: null });
      mockFrom.mockReturnValue({ insert });

      const res = await insertWalkSession({
        userId: "u1",
        petId: "p1",
        startedAt: new Date("2026-01-01T10:00:00Z"),
        endedAt: new Date("2026-01-01T10:30:00Z"),
        distanceMeters: 123.456,
        durationSeconds: 90.7,
        points: [],
      });

      expect(res).toEqual({ id: "walk-1" });
      expect(insert).toHaveBeenCalledWith(
        expect.objectContaining({
          user_id: "u1",
          pet_id: "p1",
          distance_meters: 123.5,
          duration_seconds: 90,
          points: null,
        })
      );
    });

    it("passes points JSON when non-empty", async () => {
      const insert = chainInsertSingle({ data: { id: "w2" }, error: null });
      mockFrom.mockReturnValue({ insert });
      const pts = [{ lat: 1, lng: 2, t: 3 }];
      await insertWalkSession({
        userId: "u1",
        petId: "p1",
        startedAt: new Date(),
        endedAt: new Date(),
        distanceMeters: 1,
        durationSeconds: 1,
        points: pts,
      });
      expect(insert).toHaveBeenCalledWith(
        expect.objectContaining({
          points: pts,
        })
      );
    });

    it("returns null on insert error", async () => {
      const insert = chainInsertSingle({ data: null, error: new Error("rls") });
      mockFrom.mockReturnValue({ insert });
      const res = await insertWalkSession({
        userId: "u1",
        petId: "p1",
        startedAt: new Date(),
        endedAt: new Date(),
        distanceMeters: 1,
        durationSeconds: 1,
        points: [],
      });
      expect(res).toBeNull();
    });
  });

  it("fetchRecentWalkSessions returns empty on error", async () => {
    const { select } = chainSelectEqOrderLimit({ data: null, error: new Error("x") });
    mockFrom.mockReturnValue({ select });
    await expect(fetchRecentWalkSessions("pet-x")).resolves.toEqual([]);
  });

  it("fetchWeekDistanceKmForPet sums meters and converts to km", async () => {
    const { select, gte } = chainSelectEqGte({
      data: [{ distance_meters: 1000 }, { distance_meters: 500 }],
      error: null,
    });
    mockFrom.mockReturnValue({ select });
    const km = await fetchWeekDistanceKmForPet("pet-1");
    expect(km).toBe(1.5);
    expect(gte).toHaveBeenCalledWith("ended_at", expect.any(String));
  });

  it("fetchLifetimeWalkAggregatesForPet counts and sums", async () => {
    const eq = jest.fn().mockResolvedValue({
      data: [{ distance_meters: 1609.344 }, { distance_meters: 1609.344 }],
      error: null,
    });
    const select = jest.fn().mockReturnValue({ eq });
    mockFrom.mockReturnValue({ select });
    await expect(fetchLifetimeWalkAggregatesForPet("p1")).resolves.toEqual({
      walkCount: 2,
      totalMeters: 1609.344 * 2,
    });
  });

  it("fetchSessionsForStreak returns rows", async () => {
    const slices = [{ ended_at: "2026-01-01", distance_meters: 400 }];
    const { select } = chainSelectEqGte({ data: slices, error: null });
    mockFrom.mockReturnValue({ select });
    await expect(fetchSessionsForStreak("p1", 30)).resolves.toEqual(slices);
  });

  it("fetchMyWeeklyWalkerRank parses rpc row", async () => {
    mockRpc.mockResolvedValue({ data: [{ rank: 2, total: 10 }], error: null });
    await expect(fetchMyWeeklyWalkerRank()).resolves.toEqual({ rank: 2, total: 10 });
    expect(mockRpc).toHaveBeenCalledWith("pawthon_my_weekly_walker_rank");
  });

  it("fetchMyWeeklyWalkerRank returns null rank on rpc error", async () => {
    mockRpc.mockResolvedValue({ data: null, error: new Error("rpc") });
    await expect(fetchMyWeeklyWalkerRank()).resolves.toEqual({ rank: null, total: 0 });
  });
});
