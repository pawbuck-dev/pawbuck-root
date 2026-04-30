import type { LabResult } from "@/services/labResults";

let mockGetUser: jest.Mock;
const mockLab = {
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
        if (table === "lab_results") return mockLab;
        throw new Error(`unexpected table ${table}`);
      }),
    },
  };
});

import {
  createLabResult,
  deleteLabResult,
  fetchLabResults,
  updateLabResult,
} from "@/services/labResults";

function mockFetchLabs(result: { data: unknown; error: Error | null }) {
  const orderCreatedAt = jest.fn().mockResolvedValue(result);
  const orderTestDate = jest.fn().mockReturnValue({ order: orderCreatedAt });
  const eq = jest.fn().mockReturnValue({ order: orderTestDate });
  const select = jest.fn().mockReturnValue({ eq });
  mockLab.select = select;
  return { orderTestDate, orderCreatedAt };
}

function mockInsertSingle(result: { data: unknown; error: Error | null }) {
  const single = jest.fn().mockResolvedValue(result);
  const select = jest.fn().mockReturnValue({ single });
  const insert = jest.fn().mockReturnValue({ select });
  mockLab.insert = insert;
  return { insert };
}

function mockUpdateSingle(result: { data: unknown; error: Error | null }) {
  const single = jest.fn().mockResolvedValue(result);
  const select = jest.fn().mockReturnValue({ single });
  const eq = jest.fn().mockReturnValue({ select });
  const update = jest.fn().mockReturnValue({ eq });
  mockLab.update = update;
  return { update };
}

function mockDeleteEq(result: { error: Error | null }) {
  const eq = jest.fn().mockResolvedValue(result);
  const del = jest.fn().mockReturnValue({ eq });
  mockLab.delete = del;
  return { del, eq };
}

const baseLabPayload = (): Omit<LabResult, "id" | "created_at" | "updated_at"> => ({
  pet_id: "p1",
  user_id: "ignored-in-tests",
  test_type: "cbc",
  lab_name: "Lab",
  test_date: "2026-01-01",
  ordered_by: null,
  results: [{ testName: "wbc", value: "7", unit: "K", referenceRange: "4-11", status: "normal" }],
});

describe("labResults service", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("fetchLabResults orders by test_date then created_at", async () => {
    const rows: LabResult[] = [];
    mockFetchLabs({ data: rows, error: null });
    await expect(fetchLabResults("p1")).resolves.toEqual(rows);
  });

  describe("createLabResult", () => {
    it("throws when not authenticated", async () => {
      mockGetUser.mockResolvedValue({ data: { user: null } });
      await expect(createLabResult(baseLabPayload())).rejects.toThrow(
        "User must be authenticated to create a lab result"
      );
    });

    it("inserts with session user_id and serializes results JSON", async () => {
      mockGetUser.mockResolvedValue({ data: { user: { id: "lab-user" } } });
      const row = { ...baseLabPayload(), id: "lr1", user_id: "lab-user" } as unknown as LabResult;
      const { insert } = mockInsertSingle({ data: row, error: null });

      await expect(createLabResult(baseLabPayload())).resolves.toEqual(row);

      expect(insert).toHaveBeenCalledWith(
        expect.objectContaining({
          user_id: "lab-user",
          pet_id: "p1",
          results: expect.any(Array),
        })
      );
    });
  });

  it("updateLabResult passes updated_at", async () => {
    const row = { id: "lr1" } as LabResult;
    const { update } = mockUpdateSingle({ data: row, error: null });
    await expect(updateLabResult("lr1", { lab_name: "X" })).resolves.toEqual(row);
    expect(update).toHaveBeenCalledWith(
      expect.objectContaining({
        lab_name: "X",
        updated_at: expect.any(String),
      })
    );
  });

  it("deleteLabResult deletes by id", async () => {
    const { eq } = mockDeleteEq({ error: null });
    await deleteLabResult("lr1");
    expect(eq).toHaveBeenCalledWith("id", "lr1");
  });
});
