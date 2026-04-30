import type { Tables } from "@/database.types";

let mockGetUser: jest.Mock;
const mockVaccinations = {
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
        if (table === "vaccinations") return mockVaccinations;
        throw new Error(`unexpected table ${table}`);
      }),
    },
  };
});

import {
  createVaccination,
  deleteVaccination,
  getVaccinationsByPetId,
  getVaccinationsByUserId,
  updateVaccination,
} from "@/services/vaccinations";

function mockSelectChain(result: { data: unknown; error: Error | null }) {
  const order = jest.fn().mockResolvedValue(result);
  const eq = jest.fn().mockReturnValue({ order });
  const select = jest.fn().mockReturnValue({ eq });
  mockVaccinations.select = select;
  return { select, eq, order };
}

function mockInsertSingle(result: { data: Tables<"vaccinations"> | null; error: (Error & { code?: string }) | null }) {
  const single = jest.fn().mockResolvedValue(result);
  const select = jest.fn().mockReturnValue({ single });
  const insert = jest.fn().mockReturnValue({ select });
  mockVaccinations.insert = insert;
  return { insert, single };
}

function mockUpdateSingle(result: { data: Tables<"vaccinations"> | null; error: Error | null }) {
  const single = jest.fn().mockResolvedValue(result);
  const select = jest.fn().mockReturnValue({ single });
  const eq = jest.fn().mockReturnValue({ select });
  const update = jest.fn().mockReturnValue({ eq });
  mockVaccinations.update = update;
  return { update, eq, single };
}

function mockDeleteEq(result: { error: Error | null }) {
  const eq = jest.fn().mockResolvedValue(result);
  const del = jest.fn().mockReturnValue({ eq });
  mockVaccinations.delete = del;
  return { del, eq };
}

describe("vaccinations service", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("getVaccinationsByPetId", () => {
    it("filters by pet_id and orders by date desc", async () => {
      const rows = [{ id: "v1" } as Tables<"vaccinations">];
      const { eq, order } = mockSelectChain({ data: rows, error: null });
      await expect(getVaccinationsByPetId("pet-1")).resolves.toEqual(rows);
      expect(mockVaccinations.select).toHaveBeenCalledWith("*");
      expect(eq).toHaveBeenCalledWith("pet_id", "pet-1");
      expect(order).toHaveBeenCalledWith("date", { ascending: false });
    });
  });

  describe("getVaccinationsByUserId", () => {
    it("filters by user_id", async () => {
      const rows = [] as Tables<"vaccinations">[];
      const { eq } = mockSelectChain({ data: rows, error: null });
      await expect(getVaccinationsByUserId("u1")).resolves.toEqual(rows);
      expect(eq).toHaveBeenCalledWith("user_id", "u1");
    });
  });

  describe("createVaccination", () => {
    it("throws when not authenticated", async () => {
      mockGetUser.mockResolvedValue({ data: { user: null } });
      await expect(createVaccination({ name: "Rabies" } as never)).rejects.toThrow(
        "User must be authenticated to create a vaccination"
      );
    });

    it("inserts with session user_id for RLS", async () => {
      mockGetUser.mockResolvedValue({ data: { user: { id: "actor-1" } } });
      const row = { id: "v-new", user_id: "actor-1", name: "Rabies" } as Tables<"vaccinations">;
      const { insert } = mockInsertSingle({ data: row, error: null });

      await expect(
        createVaccination({ name: "Rabies", pet_id: "p1", user_id: "wrong" } as never)
      ).resolves.toEqual(row);

      expect(insert).toHaveBeenCalledWith(
        expect.objectContaining({
          name: "Rabies",
          pet_id: "p1",
          user_id: "actor-1",
        })
      );
    });

    it("maps unique violation to DUPLICATE_VACCINATION", async () => {
      mockGetUser.mockResolvedValue({ data: { user: { id: "u1" } } });
      mockInsertSingle({
        data: null,
        error: Object.assign(new Error("dup"), { code: "23505" }),
      });
      await expect(createVaccination({} as never)).rejects.toThrow("DUPLICATE_VACCINATION:");
    });
  });

  describe("updateVaccination / deleteVaccination", () => {
    it("updates by id and returns row", async () => {
      const row = { id: "v1", name: "Updated" } as Tables<"vaccinations">;
      const { update } = mockUpdateSingle({ data: row, error: null });
      await expect(updateVaccination("v1", { name: "Updated" })).resolves.toEqual(row);
      expect(update).toHaveBeenCalledWith({ name: "Updated" });
    });

    it("deletes by id", async () => {
      const { eq } = mockDeleteEq({ error: null });
      await deleteVaccination("v1");
      expect(eq).toHaveBeenCalledWith("id", "v1");
    });
  });
});
