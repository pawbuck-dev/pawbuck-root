import { resolveReviewInboxEmail } from "@/utils/mailResolveApi";

const mockGetSession = jest.fn();

jest.mock("@/utils/supabase", () => ({
  supabase: {
    auth: {
      getSession: (...args: unknown[]) => mockGetSession(...args),
    },
  },
}));

describe("mailResolveApi", () => {
  const orig = process.env.EXPO_PUBLIC_PAWBUCK_API_URL;

  beforeEach(() => {
    mockGetSession.mockResolvedValue({
      data: { session: { access_token: "jwt-token" } },
      error: null,
    });
    process.env.EXPO_PUBLIC_PAWBUCK_API_URL = "https://api.test.pawbuck.com";
    global.fetch = jest.fn();
  });

  afterEach(() => {
    jest.restoreAllMocks();
    if (orig === undefined) delete process.env.EXPO_PUBLIC_PAWBUCK_API_URL;
    else process.env.EXPO_PUBLIC_PAWBUCK_API_URL = orig;
  });

  it("throws when not signed in", async () => {
    mockGetSession.mockResolvedValue({ data: { session: null }, error: null });
    await expect(
      resolveReviewInboxEmail({
        emailId: "e1",
        selectedPetId: "p1",
        selectedDocType: "vaccinations",
      })
    ).rejects.toThrow("Please sign in");
  });

  it("throws when API URL missing", async () => {
    delete process.env.EXPO_PUBLIC_PAWBUCK_API_URL;
    await expect(
      resolveReviewInboxEmail({
        emailId: "e1",
        selectedPetId: "p1",
        selectedDocType: "medications",
      })
    ).rejects.toThrow("PawBuck API URL is not configured");
  });

  it("POSTs resolve payload with auth header", async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      status: 200,
      statusText: "OK",
      text: async () => "",
    });

    await resolveReviewInboxEmail({
      emailId: "email-uuid",
      selectedPetId: "pet-uuid",
      selectedDocType: "lab_results",
    });

    expect(global.fetch).toHaveBeenCalledWith(
      "https://api.test.pawbuck.com/api/mail/resolve",
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({
          Authorization: "Bearer jwt-token",
        }),
        body: JSON.stringify({
          email_id: "email-uuid",
          selected_pet_id: "pet-uuid",
          selected_doc_type: "lab_results",
        }),
      })
    );
  });

  it("parses JSON error from failed response", async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: false,
      status: 400,
      statusText: "Bad Request",
      text: async () => JSON.stringify({ error: "Archive missing" }),
    });

    await expect(
      resolveReviewInboxEmail({
        emailId: "e1",
        selectedPetId: "p1",
        selectedDocType: "clinical_exams",
      })
    ).rejects.toThrow("Archive missing");
  });
});
