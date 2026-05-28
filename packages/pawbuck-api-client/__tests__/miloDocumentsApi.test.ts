import { analyzePetDocument } from "../src/miloDocumentsApi";
import {
  MILO_DOCUMENT_TIMEOUT_MESSAGE,
  MILO_DOCUMENT_UNAVAILABLE_MESSAGE,
  normalizeNonJsonApiError,
} from "../src/httpErrors";

describe("httpErrors", () => {
  it("normalizeNonJsonApiError replaces HTML 504 body", () => {
    const html =
      "<html><head><title>504 Gateway Time-out</title></head><body><center><h1>504 Gateway Time-out</h1></center></body></html>";
    expect(normalizeNonJsonApiError(504, html)).toBe(MILO_DOCUMENT_TIMEOUT_MESSAGE);
  });

  it("normalizeNonJsonApiError maps 503 to unavailable message", () => {
    expect(normalizeNonJsonApiError(503, "")).toBe(MILO_DOCUMENT_UNAVAILABLE_MESSAGE);
  });
});

describe("miloDocumentsApi", () => {
  beforeEach(() => {
    global.fetch = jest.fn();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it("POSTs analyze with bearer token", async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      status: 200,
      text: async () =>
        JSON.stringify({
          id: "d1",
          petId: "pet-1",
          userId: "user-1",
          storagePath: "path/doc.pdf",
          mimeType: "application/pdf",
          documentType: "vaccinations",
          confidence: 0.9,
          extractedJson: "{}",
          metadata: null,
          createdAt: "2026-01-01T00:00:00Z",
          updatedAt: "2026-01-01T00:00:00Z",
        }),
    });

    const row = await analyzePetDocument("https://api.test.com/", "token", {
      petId: "pet-1",
      path: "path/doc.pdf",
      mimeType: "application/pdf",
    });

    expect(global.fetch).toHaveBeenCalledWith(
      "https://api.test.com/api/milo/documents/analyze",
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({ Authorization: "Bearer token" }),
      })
    );
    expect(row.documentType).toBe("vaccinations");
  });

  it("throws friendly message for HTML 504 body", async () => {
    const html =
      "<html><head><title>504 Gateway Time-out</title></head><body><center><h1>504 Gateway Time-out</h1></center></body></html>";
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: false,
      status: 504,
      text: async () => html,
    });

    await expect(
      analyzePetDocument("https://api.test.com", "t", {
        petId: "pet-1",
        path: "path/doc.pdf",
      })
    ).rejects.toThrow(MILO_DOCUMENT_TIMEOUT_MESSAGE);
  });

  it("throws JSON error field from API", async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: false,
      status: 400,
      text: async () => JSON.stringify({ error: "petId is required" }),
    });

    await expect(
      analyzePetDocument("https://api.test.com", "t", {
        petId: "pet-1",
        path: "path/doc.pdf",
      })
    ).rejects.toThrow("petId is required");
  });

  it("retries on 504 then succeeds on third attempt", async () => {
    const html504 =
      "<html><head><title>504 Gateway Time-out</title></head><body><center><h1>504 Gateway Time-out</h1></center></body></html>";
    const successBody = {
      id: "d1",
      petId: "pet-1",
      userId: "user-1",
      storagePath: "path/doc.pdf",
      mimeType: "application/pdf",
      documentType: "vaccinations",
      confidence: 0.9,
      extractedJson: "{}",
      metadata: null,
      createdAt: "2026-01-01T00:00:00Z",
      updatedAt: "2026-01-01T00:00:00Z",
    };

    (global.fetch as jest.Mock)
      .mockResolvedValueOnce({ ok: false, status: 504, text: async () => html504 })
      .mockResolvedValueOnce({ ok: false, status: 504, text: async () => html504 })
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        text: async () => JSON.stringify(successBody),
      });

    const row = await analyzePetDocument("https://api.test.com", "t", {
      petId: "pet-1",
      path: "path/doc.pdf",
    });

    expect(global.fetch).toHaveBeenCalledTimes(3);
    expect(row.id).toBe("d1");
  });

  it("does not retry on 400", async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: false,
      status: 400,
      text: async () => JSON.stringify({ error: "bad request" }),
    });

    await expect(
      analyzePetDocument("https://api.test.com", "t", {
        petId: "pet-1",
        path: "path/doc.pdf",
      })
    ).rejects.toThrow("bad request");

    expect(global.fetch).toHaveBeenCalledTimes(1);
  });
});
