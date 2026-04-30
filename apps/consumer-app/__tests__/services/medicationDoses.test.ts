let mockGetUser: jest.Mock;
const mockDoses = {
  select: jest.fn(),
  insert: jest.fn(),
  update: jest.fn(),
};
const mockMedicines = {
  update: jest.fn(),
};

jest.mock("@/utils/supabase", () => {
  mockGetUser = jest.fn();
  return {
    supabase: {
      auth: { getUser: mockGetUser },
      from: jest.fn((table: string) => {
        if (table === "medication_doses") return mockDoses;
        if (table === "medicines") return mockMedicines;
        throw new Error(`unexpected table ${table}`);
      }),
    },
  };
});

import {
  getTodaysMedicationDoses,
  markMedicationDoseComplete,
} from "@/services/medicationDoses";

function mockTodaysChain(result: { data: unknown; error: Error | null }) {
  const order = jest.fn().mockResolvedValue(result);
  const lt = jest.fn().mockReturnValue({ order });
  const gte = jest.fn().mockReturnValue({ lt });
  const eq = jest.fn().mockReturnValue({ gte });
  const select = jest.fn().mockReturnValue({ eq });
  mockDoses.select = select;
  return { eq, gte, lt, order };
}

function mockFindExistingSingle(existing: { data: unknown; error: Error | null }) {
  const single = jest.fn().mockResolvedValue(existing);
  const eqTime = jest.fn().mockReturnValue({ single });
  const eqMed = jest.fn().mockReturnValue({ eq: eqTime });
  const eqPet = jest.fn().mockReturnValue({ eq: eqMed });
  const select = jest.fn().mockReturnValue({ eq: eqPet });
  mockDoses.select = select;
  return { single, eqPet, eqMed, eqTime };
}

function mockUpdateDoseSingle(result: { data: unknown; error: Error | null }) {
  const single = jest.fn().mockResolvedValue(result);
  const select = jest.fn().mockReturnValue({ single });
  const eqId = jest.fn().mockReturnValue({ select });
  const update = jest.fn().mockReturnValue({ eq: eqId });
  mockDoses.update = update;
  return { update, single };
}

function mockInsertDoseSingle(result: { data: unknown; error: Error | null }) {
  const single = jest.fn().mockResolvedValue(result);
  const select = jest.fn().mockReturnValue({ single });
  const insert = jest.fn().mockReturnValue({ select });
  mockDoses.insert = insert;
  return { insert, single };
}

function mockMedicinesLastGiven() {
  const eq = jest.fn().mockResolvedValue({ error: null });
  const update = jest.fn().mockReturnValue({ eq });
  mockMedicines.update = update;
  return { update, eq };
}

describe("medicationDoses service", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("getTodaysMedicationDoses filters scheduled_time to UTC day window", async () => {
    const rows = [{ id: "d1" }];
    const { gte, lt } = mockTodaysChain({ data: rows, error: null });
    await expect(getTodaysMedicationDoses("pet-1")).resolves.toEqual(rows);
    expect(gte).toHaveBeenCalledWith("scheduled_time", expect.any(String));
    expect(lt).toHaveBeenCalledWith("scheduled_time", expect.any(String));
  });

  describe("markMedicationDoseComplete", () => {
    it("throws when not authenticated", async () => {
      mockGetUser.mockResolvedValue({ data: { user: null } });
      await expect(
        markMedicationDoseComplete("p1", "med1", new Date("2026-06-01T12:00:00.000Z"))
      ).rejects.toThrow("User not authenticated");
    });

    it("updates existing dose when row found", async () => {
      mockGetUser.mockResolvedValue({ data: { user: { id: "u1" } } });
      const existingRow = { id: "dose-1", pet_id: "p1", medication_id: "med1" };
      mockFindExistingSingle({ data: existingRow, error: null });
      const updated = { ...existingRow, completed_at: "2026-01-01T00:00:00.000Z" };
      const { update, single } = mockUpdateDoseSingle({ data: updated, error: null });

      const t = new Date("2026-06-01T15:00:00.000Z");
      await expect(markMedicationDoseComplete("p1", "med1", t)).resolves.toEqual(updated);

      expect(update).toHaveBeenCalledWith(
        expect.objectContaining({
          completed_at: expect.any(String),
          updated_at: expect.any(String),
        })
      );
      expect(single).toHaveBeenCalled();
    });

    it("inserts new dose with session user_id then updates medicine last_given_at", async () => {
      mockGetUser.mockResolvedValue({ data: { user: { id: "walker-1" } } });
      mockFindExistingSingle({ data: null, error: null });
      const inserted = {
        id: "dose-new",
        pet_id: "p1",
        medication_id: "med1",
        user_id: "walker-1",
        completed_at: "2026-01-02T00:00:00.000Z",
      };
      const { insert } = mockInsertDoseSingle({ data: inserted, error: null });
      const { update: medUpdate, eq: medEq } = mockMedicinesLastGiven();

      const t = new Date("2026-06-02T08:00:00.000Z");
      await expect(markMedicationDoseComplete("p1", "med1", t)).resolves.toEqual(inserted);

      expect(insert).toHaveBeenCalledWith(
        expect.objectContaining({
          pet_id: "p1",
          medication_id: "med1",
          scheduled_time: t.toISOString(),
          user_id: "walker-1",
          completed_at: expect.any(String),
        })
      );
      expect(medUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          last_given_at: expect.any(String),
          updated_at: expect.any(String),
        })
      );
      expect(medEq).toHaveBeenCalledWith("id", "med1");
    });
  });
});
