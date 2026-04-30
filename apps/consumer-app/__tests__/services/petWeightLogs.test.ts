let mockGetUser: jest.Mock;
const mockWeightLogs = { select: jest.fn(), insert: jest.fn() };
const mockPets = { update: jest.fn() };

jest.mock("@/utils/supabase", () => {
  mockGetUser = jest.fn();
  return {
    supabase: {
      auth: { getUser: mockGetUser },
      from: jest.fn((t: string) => {
        if (t === "pet_weight_logs") return mockWeightLogs;
        if (t === "pets") return mockPets;
        throw new Error(t);
      }),
    },
  };
});

import { insertWeightLog, listWeightLogs, updatePetTargetWeight } from "@/services/petWeightLogs";
import { kgToLbs } from "@/utils/weightUnits";

function chainList(result: { data: unknown; error: Error | null }) {
  const limit = jest.fn().mockResolvedValue(result);
  const order = jest.fn().mockReturnValue({ limit });
  const eq = jest.fn().mockReturnValue({ order });
  const select = jest.fn().mockReturnValue({ eq });
  mockWeightLogs.select = select;
  return select;
}

function chainInsertWeightThenPetsUpdate(insertResult: { data: unknown; error: Error | null }) {
  const single = jest.fn().mockResolvedValue(insertResult);
  const select = jest.fn().mockReturnValue({ single });
  const insert = jest.fn().mockReturnValue({ select });
  mockWeightLogs.insert = insert;

  const eqUser = jest.fn().mockResolvedValue({ error: null });
  const eqPet = jest.fn().mockReturnValue({ eq: eqUser });
  const update = jest.fn().mockReturnValue({ eq: eqPet });
  mockPets.update = update;
  return { insert, update, eqPet, eqUser };
}

describe("petWeightLogs service", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("listWeightLogs returns data", async () => {
    const rows = [{ id: "w1" }];
    chainList({ data: rows, error: null });
    await expect(listWeightLogs("p1", 10)).resolves.toEqual(rows);
  });

  it("insertWeightLog throws when not authenticated", async () => {
    mockGetUser.mockResolvedValue({ data: { user: null }, error: null });
    await expect(insertWeightLog("p1", 10, "kg")).rejects.toThrow("User not authenticated");
  });

  it("insertWeightLog inserts then updates pets weight in lbs", async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: "u1" } }, error: null });
    const row = { id: "wl1", pet_id: "p1", user_id: "u1", weight_value: 10, weight_unit: "kg" };
    const { insert, update, eqPet, eqUser } = chainInsertWeightThenPetsUpdate({
      data: row,
      error: null,
    });

    await expect(insertWeightLog("p1", 10, "kg")).resolves.toEqual(row);
    expect(insert).toHaveBeenCalledWith(
      expect.objectContaining({
        pet_id: "p1",
        user_id: "u1",
        weight_value: 10,
        weight_unit: "kg",
      })
    );
    expect(update).toHaveBeenCalledWith(
      expect.objectContaining({
        weight_unit: "lbs",
        weight_value: kgToLbs(10),
      })
    );
    expect(eqPet).toHaveBeenCalledWith("id", "p1");
    expect(eqUser).toHaveBeenCalledWith("user_id", "u1");
  });

  it("updatePetTargetWeight updates pets row", async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: "u1" } }, error: null });
    const eqUser = jest.fn().mockResolvedValue({ error: null });
    const eqPet = jest.fn().mockReturnValue({ eq: eqUser });
    const update = jest.fn().mockReturnValue({ eq: eqPet });
    mockPets.update = update;

    await updatePetTargetWeight("p1", 12, "lbs");
    expect(update).toHaveBeenCalledWith({
      target_weight_value: 12,
      target_weight_unit: "lbs",
    });
  });
});
