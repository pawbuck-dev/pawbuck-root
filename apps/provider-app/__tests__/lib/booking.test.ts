import { fetchClinicAvailability } from "../../lib/booking";

describe("fetchClinicAvailability", () => {
  const orig = process.env.EXPO_PUBLIC_PAWBUCK_API_URL;
  const token = "provider-test-token";

  afterEach(() => {
    jest.restoreAllMocks();
    if (orig === undefined) delete process.env.EXPO_PUBLIC_PAWBUCK_API_URL;
    else process.env.EXPO_PUBLIC_PAWBUCK_API_URL = orig;
  });

  it("throws when API URL missing", async () => {
    delete process.env.EXPO_PUBLIC_PAWBUCK_API_URL;
    await expect(
      fetchClinicAvailability(token, {
        clinicId: "x",
        rangeStartUtc: "a",
        rangeEndUtc: "b",
      })
    ).rejects.toThrow("EXPO_PUBLIC_PAWBUCK_API_URL is not set");
  });

  it("calls PawBuck.API availability with Authorization", async () => {
    process.env.EXPO_PUBLIC_PAWBUCK_API_URL = "http://127.0.0.1:5997";
    jest.spyOn(global, "fetch").mockResolvedValue(
      new Response(JSON.stringify({ slots: [] }), { status: 200 })
    );

    await fetchClinicAvailability(token, {
      clinicId: "00000000-0000-0000-0000-000000000001",
      rangeStartUtc: "2025-01-01T00:00:00Z",
      rangeEndUtc: "2025-01-02T00:00:00Z",
    });

    expect(fetch).toHaveBeenCalledWith(
      "http://127.0.0.1:5997/api/bookings/availability",
      expect.objectContaining({
        headers: expect.objectContaining({
          Authorization: "Bearer provider-test-token",
        }),
      })
    );
  });
});
