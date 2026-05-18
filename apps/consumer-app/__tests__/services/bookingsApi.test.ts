import { bookAppointment, fetchAvailability } from "@/services/bookingsApi";

const mockGetSession = jest.fn();

jest.mock("@/utils/supabase", () => ({
  supabase: {
    auth: {
      getSession: (...args: unknown[]) => mockGetSession(...args),
    },
  },
}));

describe("bookingsApi (consumer wrapper)", () => {
  const orig = process.env.EXPO_PUBLIC_PAWBUCK_API_URL;

  beforeEach(() => {
    mockGetSession.mockResolvedValue({
      data: { session: { access_token: "test-jwt-token" } },
      error: null,
    });
  });

  afterEach(() => {
    jest.restoreAllMocks();
    if (orig === undefined) delete process.env.EXPO_PUBLIC_PAWBUCK_API_URL;
    else process.env.EXPO_PUBLIC_PAWBUCK_API_URL = orig;
  });

  it("throws when EXPO_PUBLIC_PAWBUCK_API_URL is not set", async () => {
    delete process.env.EXPO_PUBLIC_PAWBUCK_API_URL;
    await expect(
      fetchAvailability({
        clinicId: "x",
        rangeStartUtc: "a",
        rangeEndUtc: "b",
      })
    ).rejects.toThrow("EXPO_PUBLIC_PAWBUCK_API_URL is not set");
  });

  it("throws when not signed in", async () => {
    process.env.EXPO_PUBLIC_PAWBUCK_API_URL = "http://127.0.0.1:5998";
    mockGetSession.mockResolvedValue({ data: { session: null }, error: null });
    await expect(
      fetchAvailability({
        clinicId: "x",
        rangeStartUtc: "a",
        rangeEndUtc: "b",
      })
    ).rejects.toThrow("Not signed in");
  });

  it("forwards Authorization header to PawBuck.API when base URL is set", async () => {
    process.env.EXPO_PUBLIC_PAWBUCK_API_URL = "http://127.0.0.1:5998";
    jest.spyOn(global, "fetch").mockResolvedValue(
      new Response(JSON.stringify({ slots: [] }), { status: 200 })
    );

    await fetchAvailability({
      clinicId: "00000000-0000-0000-0000-000000000001",
      rangeStartUtc: "2025-01-01T00:00:00Z",
      rangeEndUtc: "2025-01-02T00:00:00Z",
    });

    expect(fetch).toHaveBeenCalledWith(
      "http://127.0.0.1:5998/api/bookings/availability",
      expect.objectContaining({
        headers: expect.objectContaining({
          Authorization: "Bearer test-jwt-token",
        }),
      })
    );
  });

  it("bookAppointment throws when env missing", async () => {
    delete process.env.EXPO_PUBLIC_PAWBUCK_API_URL;
    await expect(
      bookAppointment({
        clinicId: "x",
        startUtc: "a",
        endUtc: "b",
        selectionToken: "t",
      })
    ).rejects.toThrow("EXPO_PUBLIC_PAWBUCK_API_URL is not set");
  });
});
