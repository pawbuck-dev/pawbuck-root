import type { Tables } from "@/database.types";

let mockGetUser: jest.Mock;
const mockMedicines = {
  select: jest.fn(),
  insert: jest.fn(),
  update: jest.fn(),
  delete: jest.fn(),
};

jest.mock("@/utils/supabase", () => {
  mockGetUser = jest.fn();
  return {
    supabase: {
      auth: { getUser: mockGetUser },
      from: jest.fn((table: string) => {
        if (table === "medicines") return mockMedicines;
        throw new Error(`unexpected table ${table}`);
      }),
    },
  };
});

import { addMedicine, deleteMedicine, fetchMedicines, updateMedicine } from "@/services/medicines";

function mockSelectPet(petId: string, result: { data: unknown; error: Error | null }) {
  const order = jest.fn().mockResolvedValue(result);
  const eq = jest.fn().mockReturnValue({ order });
  const select = jest.fn().mockReturnValue({ eq });
  mockMedicines.select = select;
  return { eq, order };
}

function mockInsertSingle(result: { data: Tables<"medicines"> | null; error: (Error & { code?: string }) | null }) {
  const single = jest.fn().mockResolvedValue(result);
  const select = jest.fn().mockReturnValue({ single });
  const insert = jest.fn().mockReturnValue({ select });
  mockMedicines.insert = insert;
  return { insert };
}

function mockUpdateEq(result: { error: Error | null }) {
  const eq = jest.fn().mockResolvedValue(result);
  const update = jest.fn().mockReturnValue({ eq });
  mockMedicines.update = update;
  return { update, eq };
}

function mockDeleteEq(result: { error: Error | null }) {
  const eq = jest.fn().mockResolvedValue(result);
  const del = jest.fn().mockReturnValue({ eq });
  mockMedicines.delete = del;
  return { del, eq };
}

describe("medicines service", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("fetchMedicines filters by pet_id", async () => {
    const rows = [{ id: "m1" }] as Tables<"medicines">[];
    const { eq } = mockSelectPet("pet-1", { data: rows, error: null });
    await expect(fetchMedicines("pet-1")).resolves.toEqual(rows);
    expect(eq).toHaveBeenCalledWith("pet_id", "pet-1");
  });

  describe("addMedicine", () => {
    it("throws when not authenticated", async () => {
      mockGetUser.mockResolvedValue({ data: { user: null } });
      await expect(addMedicine({ name: "X" } as never)).rejects.toThrow(
        "User must be authenticated to add a medication"
      );
    });

    it("inserts with session user_id for RLS", async () => {
      mockGetUser.mockResolvedValue({ data: { user: { id: "u-act" } } });
      const row = { id: "m-new", user_id: "u-act", name: "Med" } as Tables<"medicines">;
      const { insert } = mockInsertSingle({ data: row, error: null });

      await expect(
        addMedicine({ name: "Med", pet_id: "p1", user_id: "other" } as never)
      ).resolves.toEqual(row);

      expect(insert).toHaveBeenCalledWith(
        expect.objectContaining({ user_id: "u-act", name: "Med", pet_id: "p1" })
      );
    });

    it("maps unique violation to DUPLICATE_MEDICATION", async () => {
      mockGetUser.mockResolvedValue({ data: { user: { id: "u1" } } });
      mockInsertSingle({
        data: null,
        error: Object.assign(new Error("dup"), { code: "23505" }),
      });
      await expect(addMedicine({} as never)).rejects.toThrow("DUPLICATE_MEDICATION:");
    });
  });

  it("updateMedicine updates by id", async () => {
    const { update, eq } = mockUpdateEq({ error: null });
    await updateMedicine({ id: "mid", name: "New label" } as never);
    expect(update).toHaveBeenCalledWith(expect.objectContaining({ id: "mid", name: "New label" }));
    expect(eq).toHaveBeenCalledWith("id", "mid");
  });

  it("deleteMedicine deletes by id", async () => {
    const { eq } = mockDeleteEq({ error: null });
    await deleteMedicine("mid");
    expect(eq).toHaveBeenCalledWith("id", "mid");
  });
});
