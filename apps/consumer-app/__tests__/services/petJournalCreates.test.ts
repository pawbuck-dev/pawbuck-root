import type { Tables } from "@/database.types";

let mockGetUser: jest.Mock;
const mockJournal = { select: jest.fn(), insert: jest.fn(), update: jest.fn(), delete: jest.fn() };
const mockAllergies = { select: jest.fn(), insert: jest.fn() };
const mockConditions = { select: jest.fn(), insert: jest.fn() };

jest.mock("@/utils/supabase", () => {
  mockGetUser = jest.fn();
  return {
    supabase: {
      auth: { getUser: mockGetUser },
      from: jest.fn((table: string) => {
        if (table === "pet_journal_entries") return mockJournal;
        if (table === "pet_allergies") return mockAllergies;
        if (table === "pet_conditions") return mockConditions;
        throw new Error(`unexpected table ${table}`);
      }),
    },
  };
});

import {
  createJournalEntry,
  createPetAllergy,
  createPetCondition,
} from "@/services/petJournal";

function mockInsertSingle(
  target: typeof mockJournal | typeof mockAllergies | typeof mockConditions,
  result: { data: unknown; error: Error | null }
) {
  const single = jest.fn().mockResolvedValue(result);
  const select = jest.fn().mockReturnValue({ single });
  const insert = jest.fn().mockReturnValue({ select });
  target.insert = insert;
  return { insert };
}

describe("petJournal create helpers — session user_id for RLS", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("createJournalEntry", () => {
    it("throws when not authenticated", async () => {
      mockGetUser.mockResolvedValue({ data: { user: null } });
      await expect(
        createJournalEntry({
          pet_id: "p1",
          domain: "health",
          subtype: "note",
          note: "hi",
        } as never)
      ).rejects.toThrow("Not authenticated");
    });

    it("inserts with session user_id", async () => {
      mockGetUser.mockResolvedValue({ data: { user: { id: "writer" } } });
      const row = { id: "j1", user_id: "writer", pet_id: "p1" } as Tables<"pet_journal_entries">;
      const { insert } = mockInsertSingle(mockJournal, { data: row, error: null });

      await expect(
        createJournalEntry({
          pet_id: "p1",
          domain: "health",
          subtype: "note",
          note: "hi",
          user_id: "wrong",
        } as never)
      ).resolves.toEqual(row);

      expect(insert).toHaveBeenCalledWith(
        expect.objectContaining({
          pet_id: "p1",
          user_id: "writer",
        })
      );
    });
  });

  describe("createPetAllergy", () => {
    it("throws when not authenticated", async () => {
      mockGetUser.mockResolvedValue({ data: { user: null } });
      await expect(createPetAllergy({ pet_id: "p1", label: "x" } as never)).rejects.toThrow(
        "Not authenticated"
      );
    });

    it("inserts with session user_id", async () => {
      mockGetUser.mockResolvedValue({ data: { user: { id: "u-a" } } });
      const row = { id: "a1", user_id: "u-a", label: "Pollen" } as Tables<"pet_allergies">;
      const { insert } = mockInsertSingle(mockAllergies, { data: row, error: null });

      await expect(createPetAllergy({ pet_id: "p1", label: "Pollen" } as never)).resolves.toEqual(
        row
      );
      expect(insert).toHaveBeenCalledWith(
        expect.objectContaining({ user_id: "u-a", label: "Pollen" })
      );
    });
  });

  describe("createPetCondition", () => {
    it("inserts with session user_id", async () => {
      mockGetUser.mockResolvedValue({ data: { user: { id: "u-c" } } });
      const row = { id: "c1", user_id: "u-c", name: "Arthritis" } as Tables<"pet_conditions">;
      const { insert } = mockInsertSingle(mockConditions, { data: row, error: null });

      await expect(createPetCondition({ pet_id: "p1", name: "Arthritis" } as never)).resolves.toEqual(
        row
      );
      expect(insert).toHaveBeenCalledWith(
        expect.objectContaining({ user_id: "u-c", name: "Arthritis" })
      );
    });
  });
});
