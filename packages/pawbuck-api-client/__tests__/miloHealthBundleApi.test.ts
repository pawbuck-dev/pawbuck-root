import { submitHealthRecordsBundle } from "../src/miloHealthBundleApi";

describe("miloHealthBundleApi", () => {
  beforeEach(() => {
    global.fetch = jest.fn();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it("POSTs bundle with bearer token", async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      text: async () =>
        JSON.stringify({
          confirmation: "Saved",
          scenario: "document",
          routedTo: ["pet_documents"],
          document: { id: "d1" },
          journalEntryId: null,
        }),
    });

    const res = await submitHealthRecordsBundle("https://api.test.com/", "token", {
      petId: "pet-1",
      documentPath: "user/pet/doc.pdf",
    });

    expect(global.fetch).toHaveBeenCalledWith(
      "https://api.test.com/api/milo/health-records/bundle",
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({ Authorization: "Bearer token" }),
      })
    );
    expect(res.confirmation).toBe("Saved");
  });

  it("throws API error message", async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: false,
      status: 400,
      text: async () => JSON.stringify({ error: "petId required" }),
    });

    await expect(
      submitHealthRecordsBundle("https://api.test.com", "t", { petId: "" })
    ).rejects.toThrow("petId required");
  });
});
