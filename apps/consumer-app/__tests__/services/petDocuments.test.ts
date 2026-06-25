const mockRemove = jest.fn().mockResolvedValue({ error: null });
const mockEq = jest.fn().mockResolvedValue({ error: null });
const mockDelete = jest.fn(() => ({ eq: mockEq }));
const mockFrom = jest.fn(() => ({ delete: mockDelete }));
const mockStorageFrom = jest.fn(() => ({ remove: mockRemove }));

jest.mock("@/utils/supabase", () => ({
  supabase: {
    storage: { from: (...args: unknown[]) => mockStorageFrom(...args) },
    from: (...args: unknown[]) => mockFrom(...args),
  },
}));

import { deletePetDocument } from "@/services/petDocuments";

describe("deletePetDocument", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockRemove.mockResolvedValue({ error: null });
    mockEq.mockResolvedValue({ error: null });
  });

  it("removes storage file then deletes the row", async () => {
    await deletePetDocument({
      id: "doc-1",
      storage_path: "user/pet/documents/file.pdf",
    });

    expect(mockStorageFrom).toHaveBeenCalledWith("pets");
    expect(mockRemove).toHaveBeenCalledWith(["user/pet/documents/file.pdf"]);
    expect(mockFrom).toHaveBeenCalledWith("pet_documents");
    expect(mockDelete).toHaveBeenCalled();
    expect(mockEq).toHaveBeenCalledWith("id", "doc-1");
  });

  it("skips storage remove when path is empty", async () => {
    await deletePetDocument({ id: "doc-2", storage_path: "" });
    expect(mockStorageFrom).not.toHaveBeenCalled();
    expect(mockEq).toHaveBeenCalledWith("id", "doc-2");
  });
});
