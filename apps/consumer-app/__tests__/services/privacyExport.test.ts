import { fetchPrivacyExportStatus, requestPrivacyExport } from "@/services/privacyExport";

jest.mock("@/utils/pawbuckApi", () => ({
  getPawbuckApiBaseUrl: () => "https://api.test",
}));

jest.mock("@/utils/supabase", () => ({
  supabase: {
    auth: {
      getSession: jest.fn().mockResolvedValue({
        data: { session: { access_token: "tok" } },
      }),
    },
  },
}));

describe("privacyExport", () => {
  beforeEach(() => {
    global.fetch = jest.fn();
  });

  it("requestPrivacyExport POSTs with bearer token", async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => ({ requestId: "abc" }),
    });

    const result = await requestPrivacyExport();
    expect(result.requestId).toBe("abc");
    expect(global.fetch).toHaveBeenCalledWith(
      "https://api.test/api/privacy/export",
      expect.objectContaining({ method: "POST" })
    );
  });

  it("fetchPrivacyExportStatus maps response", async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => ({ status: "ready", hasFile: true }),
    });

    const status = await fetchPrivacyExportStatus();
    expect(status.status).toBe("ready");
    expect(status.hasFile).toBe(true);
  });
});
