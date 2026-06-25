let mockGetUser: jest.Mock;
const mockDailyIntake = { select: jest.fn(), insert: jest.fn(), upsert: jest.fn() };
const mockPets = { select: jest.fn() };

jest.mock("@/utils/supabase", () => {
  mockGetUser = jest.fn();
  return {
    supabase: {
      auth: { getUser: mockGetUser },
      from: jest.fn((t: string) => {
        if (t === "daily_intake") return mockDailyIntake;
        if (t === "pets") return mockPets;
        throw new Error(t);
      }),
    },
  };
});

import { getDailyIntake, updateDailyIntake } from "@/services/dailyIntake";

function chainSelectMaybeSingle(result: { data: unknown; error: Error | null }) {
  const maybeSingle = jest.fn().mockResolvedValue(result);
  const eqDate = jest.fn().mockReturnValue({ maybeSingle });
  const eqPet = jest.fn().mockReturnValue({ eq: eqDate });
  const select = jest.fn().mockReturnValue({ eq: eqPet });
  mockDailyIntake.select = select;
  return { select, eqPet, eqDate, maybeSingle };
}

function chainInsertSingle(result: { data: unknown; error: Error | null }) {
  const single = jest.fn().mockResolvedValue(result);
  const select = jest.fn().mockReturnValue({ single });
  const insert = jest.fn().mockReturnValue({ select });
  mockDailyIntake.insert = insert;
  return { insert, select, single };
}

function chainUpsertSingle(result: { data: unknown; error: Error | null }) {
  const single = jest.fn().mockResolvedValue(result);
  const select = jest.fn().mockReturnValue({ single });
  const upsert = jest.fn().mockReturnValue({ select });
  mockDailyIntake.upsert = upsert;
  return { upsert, select, single };
}

describe("dailyIntake service (shared pet row)", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetUser.mockResolvedValue({ data: { user: { id: "user-a" } }, error: null });
  });

  it("getDailyIntake loads by pet_id and date only", async () => {
    const row = { id: "d1", pet_id: "p1", user_id: "user-b", food_intake: 2 };
    const { eqPet, eqDate } = chainSelectMaybeSingle({ data: row, error: null });

    await expect(getDailyIntake("p1")).resolves.toEqual(row);
    expect(eqPet).toHaveBeenCalledWith("pet_id", "p1");
    expect(eqDate).toHaveBeenCalledWith("date", expect.any(String));
    expect(eqDate).not.toHaveBeenCalledWith("user_id", expect.anything());
  });

  it("getDailyIntake creates one shared row when missing", async () => {
    chainSelectMaybeSingle({ data: null, error: null });
    const maybeSingle = jest.fn().mockResolvedValue({
      data: { animal_type: "dog", breed: "Mixed", weight_value: 40, weight_unit: "lbs" },
      error: null,
    });
    const eqId = jest.fn().mockReturnValue({ maybeSingle });
    const petSelect = jest.fn().mockReturnValue({ eq: eqId });
    mockPets.select = petSelect;

    const created = { id: "d2", pet_id: "p1", user_id: "user-a", food_intake: 0 };
    const { insert } = chainInsertSingle({ data: created, error: null });

    await expect(getDailyIntake("p1")).resolves.toEqual(created);
    expect(insert).toHaveBeenCalledWith(
      expect.objectContaining({
        pet_id: "p1",
        user_id: "user-a",
        food_intake: 0,
      })
    );
  });

  it("updateDailyIntake upserts on pet_id,date conflict", async () => {
    const updated = { id: "d1", pet_id: "p1", user_id: "user-a", food_intake: 3 };
    const { upsert } = chainUpsertSingle({ data: updated, error: null });

    await expect(updateDailyIntake("p1", { food_intake: 3 })).resolves.toEqual(updated);
    expect(upsert).toHaveBeenCalledWith(
      expect.objectContaining({ pet_id: "p1", user_id: "user-a", food_intake: 3 }),
      { onConflict: "pet_id,date" }
    );
  });
});
