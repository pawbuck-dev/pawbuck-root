const mockGetSession = jest.fn();
const mockGetPawbuckApiBaseUrl = jest.fn();

jest.mock("@/utils/supabase", () => ({
  supabase: {
    auth: { getSession: (...a: unknown[]) => mockGetSession(...a) },
  },
}));

jest.mock("@/utils/pawbuckApi", () => ({
  getPawbuckApiBaseUrl: () => mockGetPawbuckApiBaseUrl(),
}));

import { fetchSubscriptionFeatureGates } from "@/services/featureGatesApi";

describe("fetchSubscriptionFeatureGates", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetPawbuckApiBaseUrl.mockReturnValue("https://api.example.test");
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it("throws when base URL missing", async () => {
    mockGetPawbuckApiBaseUrl.mockReturnValue(null);
    await expect(fetchSubscriptionFeatureGates()).rejects.toThrow(
      "EXPO_PUBLIC_PAWBUCK_API_URL is not set"
    );
  });

  it("throws when not signed in", async () => {
    mockGetSession.mockResolvedValue({ data: { session: null } });
    await expect(fetchSubscriptionFeatureGates()).rejects.toThrow("Not signed in");
  });

  it("maps items to featureKey -> requiresPremium", async () => {
    mockGetSession.mockResolvedValue({
      data: { session: { access_token: "jwt-1" } },
    });
    jest.spyOn(global, "fetch").mockResolvedValue(
      new Response(
        JSON.stringify({
          items: [
            { featureKey: "pet_transfer", requiresPremium: true, label: "T", sortOrder: 1, updatedAt: "x" },
            { featureKey: "family_sharing", requiresPremium: false, label: "F", sortOrder: 2, updatedAt: "y" },
          ],
        }),
        { status: 200 }
      )
    );

    const map = await fetchSubscriptionFeatureGates();
    expect(map).toEqual({ pet_transfer: true, family_sharing: false });
    expect(fetch).toHaveBeenCalledWith(
      "https://api.example.test/api/subscription/feature-gates",
      expect.objectContaining({
        headers: { Authorization: "Bearer jwt-1" },
      })
    );
  });

  it("throws on non-OK response", async () => {
    mockGetSession.mockResolvedValue({
      data: { session: { access_token: "t" } },
    });
    jest.spyOn(global, "fetch").mockResolvedValue(new Response("bad", { status: 500 }));

    await expect(fetchSubscriptionFeatureGates()).rejects.toThrow("bad");
  });
});
