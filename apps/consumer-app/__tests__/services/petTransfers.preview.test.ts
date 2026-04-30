let mockRpc: jest.Mock;

jest.mock("@/utils/supabase", () => {
  mockRpc = jest.fn();
  return {
    supabase: {
      rpc: (...a: unknown[]) => mockRpc(...a),
    },
  };
});

import { fetchPetTransferPreview } from "@/services/petTransfers";

describe("fetchPetTransferPreview", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("calls preview_pet_transfer with trimmed uppercase code", async () => {
    mockRpc.mockResolvedValue({
      data: {
        pet: { name: "Bo", breed: null, photo_url: null, animal_type: "dog", date_of_birth: "2020-01-01" },
        highlights: [],
        summary: {
          vaccination_count: 1,
          active_medication_count: 2,
          clinical_exam_count: 3,
          document_count: 4,
        },
      },
      error: null,
    });

    const out = await fetchPetTransferPreview("  abc123  ");
    expect(mockRpc).toHaveBeenCalledWith("preview_pet_transfer", { p_code: "ABC123" });
    expect(out?.pet.name).toBe("Bo");
    expect(out?.summary).toEqual({
      vaccination_count: 1,
      active_medication_count: 2,
      clinical_exam_count: 3,
      document_count: 4,
    });
  });

  it("returns null when rpc returns null", async () => {
    mockRpc.mockResolvedValue({ data: null, error: null });
    await expect(fetchPetTransferPreview("CODE")).resolves.toBeNull();
  });

  it("returns null when payload missing pet", async () => {
    mockRpc.mockResolvedValue({ data: { highlights: [] }, error: null });
    await expect(fetchPetTransferPreview("CODE")).resolves.toBeNull();
  });

  it("throws on rpc error", async () => {
    mockRpc.mockResolvedValue({ data: null, error: new Error("rpc fail") });
    await expect(fetchPetTransferPreview("X")).rejects.toThrow("rpc fail");
  });
});
