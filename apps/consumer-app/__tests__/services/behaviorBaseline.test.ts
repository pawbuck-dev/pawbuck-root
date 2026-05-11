import type { Tables } from "@/database.types";

let mockGetUser: jest.Mock;
const mockBaseline = {
  select: jest.fn(),
  upsert: jest.fn(),
  delete: jest.fn(),
};

jest.mock("@/utils/supabase", () => {
  mockGetUser = jest.fn();
  return {
    supabase: {
      auth: { getUser: mockGetUser },
      from: jest.fn((table: string) => {
        if (table === "pet_behavior_baselines") return mockBaseline;
        throw new Error(`unexpected table ${table}`);
      }),
    },
  };
});

import {
  getBaselineContext,
  upsertBehaviorBaseline,
} from "@/services/behaviorBaseline";

describe("behaviorBaseline service", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("getBaselineContext", () => {
    it("returns null when no row exists", async () => {
      const maybeSingle = jest.fn().mockResolvedValue({ data: null, error: null });
      const eq = jest.fn().mockReturnValue({ maybeSingle });
      const select = jest.fn().mockReturnValue({ eq });
      mockBaseline.select = select;

      await expect(getBaselineContext("pet-1")).resolves.toBeNull();
      expect(eq).toHaveBeenCalledWith("pet_id", "pet-1");
    });

    it("returns the baseline row when found", async () => {
      const row = { id: "b1", pet_id: "pet-1" } as Tables<"pet_behavior_baselines">;
      const maybeSingle = jest.fn().mockResolvedValue({ data: row, error: null });
      const eq = jest.fn().mockReturnValue({ maybeSingle });
      mockBaseline.select = jest.fn().mockReturnValue({ eq });

      await expect(getBaselineContext("pet-1")).resolves.toEqual(row);
    });
  });

  describe("upsertBehaviorBaseline", () => {
    it("throws when not authenticated", async () => {
      mockGetUser.mockResolvedValue({ data: { user: null } });
      await expect(
        upsertBehaviorBaseline({
          pet_id: "p1",
          energy_level_1_to_5: 3,
          social_disposition: "selective",
          food_motivation: "normal",
          vocalization_level: "quiet",
        } as never)
      ).rejects.toThrow("Not authenticated");
    });

    it("forces user_id to the session user and conflicts on pet_id", async () => {
      mockGetUser.mockResolvedValue({ data: { user: { id: "writer" } } });
      const row = {
        id: "b1",
        pet_id: "p1",
        user_id: "writer",
      } as Tables<"pet_behavior_baselines">;
      const single = jest.fn().mockResolvedValue({ data: row, error: null });
      const select = jest.fn().mockReturnValue({ single });
      const upsert = jest.fn().mockReturnValue({ select });
      mockBaseline.upsert = upsert;

      await expect(
        upsertBehaviorBaseline({
          pet_id: "p1",
          energy_level_1_to_5: 4,
          social_disposition: "social_butterfly",
          food_motivation: "high",
          vocalization_level: "occasional_alerts",
        } as never)
      ).resolves.toEqual(row);

      expect(upsert).toHaveBeenCalledWith(
        expect.objectContaining({ pet_id: "p1", user_id: "writer" }),
        { onConflict: "pet_id" }
      );
    });
  });
});
