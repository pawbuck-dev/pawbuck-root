import type { Tables } from "@/database.types";

let mockGetUser: jest.Mock;
const mockClinical = {
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
        if (table === "clinical_exams") return mockClinical;
        throw new Error(`unexpected table ${table}`);
      }),
    },
  };
});

import {
  createClinicalExam,
  deleteClinicalExam,
  fetchClinicalExams,
  updateClinicalExam,
} from "@/services/clinicalExams";

function mockFetchExams(result: { data: unknown; error: Error | null }) {
  const orderCreatedAt = jest.fn().mockResolvedValue(result);
  const orderExamDate = jest.fn().mockReturnValue({ order: orderCreatedAt });
  const eq = jest.fn().mockReturnValue({ order: orderExamDate });
  const select = jest.fn().mockReturnValue({ eq });
  mockClinical.select = select;
  return { select, eq, orderExamDate, orderCreatedAt };
}

function mockInsertSingle(result: { data: unknown; error: Error | null }) {
  const single = jest.fn().mockResolvedValue(result);
  const select = jest.fn().mockReturnValue({ single });
  const insert = jest.fn().mockReturnValue({ select });
  mockClinical.insert = insert;
  return { insert };
}

function mockUpdateSingle(result: { data: unknown; error: Error | null }) {
  const single = jest.fn().mockResolvedValue(result);
  const select = jest.fn().mockReturnValue({ single });
  const eq = jest.fn().mockReturnValue({ select });
  const update = jest.fn().mockReturnValue({ eq });
  mockClinical.update = update;
  return { update };
}

function mockDeleteEq(result: { error: Error | null }) {
  const eq = jest.fn().mockResolvedValue(result);
  const del = jest.fn().mockReturnValue({ eq });
  mockClinical.delete = del;
  return { del, eq };
}

describe("clinicalExams service", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("fetchClinicalExams orders by exam_date then created_at", async () => {
    const rows = [{ id: "e1" }];
    const { orderExamDate, orderCreatedAt } = mockFetchExams({ data: rows, error: null });
    await expect(fetchClinicalExams("pet-1")).resolves.toEqual(rows);
    expect(orderExamDate).toHaveBeenCalledWith("exam_date", { ascending: false, nullsFirst: false });
    expect(orderCreatedAt).toHaveBeenCalledWith("created_at", { ascending: false });
  });

  describe("createClinicalExam", () => {
    it("throws when not authenticated", async () => {
      mockGetUser.mockResolvedValue({ data: { user: null } });
      await expect(createClinicalExam({ pet_id: "p1" } as never)).rejects.toThrow(
        "User must be authenticated to create a clinical exam"
      );
    });

    it("inserts with session user_id for RLS", async () => {
      mockGetUser.mockResolvedValue({ data: { user: { id: "doc-1" } } });
      const row = { id: "e-new", user_id: "doc-1", pet_id: "p1" };
      const { insert } = mockInsertSingle({ data: row, error: null });

      await expect(
        createClinicalExam({ pet_id: "p1", user_id: "wrong" } as never)
      ).resolves.toEqual(row);

      expect(insert).toHaveBeenCalledWith(
        expect.objectContaining({ pet_id: "p1", user_id: "doc-1" })
      );
    });
  });

  it("updateClinicalExam sets updated_at", async () => {
    const row = { id: "e1", title: "Visit" };
    const { update } = mockUpdateSingle({ data: row, error: null });
    await expect(updateClinicalExam("e1", { title: "Visit" } as never)).resolves.toEqual(row);
    expect(update).toHaveBeenCalledWith(
      expect.objectContaining({
        title: "Visit",
        updated_at: expect.any(String),
      })
    );
  });

  it("deleteClinicalExam deletes by id", async () => {
    const { eq } = mockDeleteEq({ error: null });
    await deleteClinicalExam("e1");
    expect(eq).toHaveBeenCalledWith("id", "e1");
  });
});
