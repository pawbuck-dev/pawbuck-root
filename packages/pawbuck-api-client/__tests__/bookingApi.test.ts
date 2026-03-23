import { bookAppointment, fetchAvailability } from "../src/bookingApi";

describe("bookingApi", () => {
  const base = "http://127.0.0.1:5999";

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it("fetchAvailability posts JSON and returns slots", async () => {
    const mockSlots = [{ startUtc: "2025-01-01T10:00:00Z", endUtc: "2025-01-01T11:00:00Z" }];
    jest.spyOn(global, "fetch").mockResolvedValue(
      new Response(JSON.stringify({ slots: mockSlots }), { status: 200 })
    );

    const result = await fetchAvailability(base, {
      clinicId: "00000000-0000-0000-0000-000000000001",
      rangeStartUtc: "2025-01-01T00:00:00Z",
      rangeEndUtc: "2025-01-02T00:00:00Z",
    });

    expect(result.slots).toEqual(mockSlots);
    expect(fetch).toHaveBeenCalledWith(
      `${base}/api/bookings/availability`,
      expect.objectContaining({ method: "POST" })
    );
  });

  it("bookAppointment sends Idempotency-Key when provided", async () => {
    jest.spyOn(global, "fetch").mockResolvedValue(
      new Response(
        JSON.stringify({
          externalAppointmentId: "ext-1",
          startUtc: "2025-01-01T10:00:00Z",
          endUtc: "2025-01-01T11:00:00Z",
          serviceType: "Veterinary",
        }),
        { status: 200 }
      )
    );

    await bookAppointment(base, {
      clinicId: "00000000-0000-0000-0000-000000000001",
      startUtc: "2025-01-01T10:00:00Z",
      endUtc: "2025-01-01T11:00:00Z",
      selectionToken: "tok",
      idempotencyKey: "key-123",
    });

    const call = (fetch as jest.Mock).mock.calls[0];
    expect(call[1].headers["Idempotency-Key"]).toBe("key-123");
  });
});
