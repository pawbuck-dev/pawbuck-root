let mockGetUser: jest.Mock;
const mockVetBookings = {
  insert: jest.fn(),
  select: jest.fn(),
  update: jest.fn(),
};
const mockThreadMessages = {
  select: jest.fn(),
};
const mockMessageThreads = {
  select: jest.fn(),
};
const mockSoftDeleteThread = jest.fn();

jest.mock("@/services/messages", () => ({
  softDeleteThread: (...args: unknown[]) => mockSoftDeleteThread(...args),
}));

jest.mock("@/utils/supabase", () => {
  mockGetUser = jest.fn();
  return {
    supabase: {
      auth: { getUser: mockGetUser },
      from: jest.fn((t: string) => {
        if (t === "vet_bookings") return mockVetBookings;
        if (t === "thread_messages") return mockThreadMessages;
        if (t === "message_threads") return mockMessageThreads;
        throw new Error(t);
      }),
    },
  };
});

import {
  confirmVetBookingImport,
  dismissVetBookingImport,
  fetchVetBookings,
  insertVetBooking,
} from "@/services/vetBookings";

function chainInsertId(result: { data: { id: string } | null; error: Error | null }) {
  const single = jest.fn().mockResolvedValue(result);
  const select = jest.fn().mockReturnValue({ single });
  const insert = jest.fn().mockReturnValue({ select });
  mockVetBookings.insert = insert;
  return insert;
}

function setupSelectChain(rows: unknown[]) {
  const chain: Record<string, jest.Mock> = {};
  chain.order = jest.fn().mockResolvedValue({ data: rows, error: null });
  chain.neq = jest.fn(() => chain);
  chain.eq = jest.fn(() => chain);
  chain.gte = jest.fn(() => chain);
  mockVetBookings.select = jest.fn(() => chain);
  return chain;
}

const validPet = "550e8400-e29b-41d4-a716-446655440001";
const validAppt = "650e8400-e29b-41d4-a716-446655440002";

describe("insertVetBooking", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("returns null when not authenticated", async () => {
    mockGetUser.mockResolvedValue({ data: { user: null }, error: null });
    const res = await insertVetBooking({
      petId: validPet,
      clinicId: "c1",
      clinicName: "Vet",
      serviceId: "wellness",
      serviceLabel: "Wellness",
      startUtc: "2026-01-01T10:00:00Z",
      endUtc: "2026-01-01T11:00:00Z",
      externalAppointmentId: "ext-1",
      pawbuckAppointmentId: validAppt,
    });
    expect(res).toBeNull();
  });

  it("nulls pet_id when value is not a UUID", async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: "user-1" } }, error: null });
    const insert = chainInsertId({ data: { id: "vb-1" }, error: null });

    await insertVetBooking({
      petId: "not-a-uuid",
      clinicId: "c1",
      clinicName: null,
      serviceId: "wellness",
      serviceLabel: "Wellness",
      startUtc: "2026-01-01T10:00:00Z",
      endUtc: "2026-01-01T11:00:00Z",
      externalAppointmentId: "ext-1",
      pawbuckAppointmentId: null,
    });

    expect(insert).toHaveBeenCalledWith(
      expect.objectContaining({
        user_id: "user-1",
        pet_id: null,
        status: "confirmed",
        booking_source: "in_app",
      })
    );
  });

  it("keeps UUID pet_id and pawbuck_appointment_id", async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: "user-1" } }, error: null });
    const insert = chainInsertId({ data: { id: "vb-2" }, error: null });

    await insertVetBooking({
      petId: validPet,
      clinicId: "c1",
      clinicName: "Clinic",
      serviceId: "wellness",
      serviceLabel: "Wellness",
      startUtc: "2026-01-01T10:00:00Z",
      endUtc: "2026-01-01T11:00:00Z",
      externalAppointmentId: "ext-2",
      pawbuckAppointmentId: validAppt,
    });

    expect(insert).toHaveBeenCalledWith(
      expect.objectContaining({
        pet_id: validPet,
        pawbuck_appointment_id: validAppt,
        booking_source: "in_app",
      })
    );
  });

  it("returns null on insert error", async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: "u1" } }, error: null });
    chainInsertId({ data: null, error: new Error("fail") });
    const res = await insertVetBooking({
      petId: null,
      clinicId: "c1",
      clinicName: null,
      serviceId: "s",
      serviceLabel: "S",
      startUtc: "a",
      endUtc: "b",
      externalAppointmentId: "e",
      pawbuckAppointmentId: null,
    });
    expect(res).toBeNull();
  });
});

describe("fetchVetBookings", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("returns empty when not authenticated", async () => {
    mockGetUser.mockResolvedValue({ data: { user: null }, error: null });
    await expect(fetchVetBookings()).resolves.toEqual([]);
  });

  it("orders by start_utc and excludes cancelled", async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: "user-1" } }, error: null });
    const rows = [{ id: "b1", start_utc: "2026-02-01T10:00:00Z" }];
    const chain = setupSelectChain(rows);
    const out = await fetchVetBookings({ startAfterIso: "2026-01-01T00:00:00Z" });
    expect(out).toEqual(rows);
    expect(mockVetBookings.select).toHaveBeenCalledWith("*");
    expect(chain.eq).toHaveBeenCalledWith("user_id", "user-1");
    expect(chain.neq).toHaveBeenCalledWith("status", "cancelled");
    expect(chain.gte).toHaveBeenCalledWith("start_utc", "2026-01-01T00:00:00Z");
    expect(chain.order).toHaveBeenCalledWith("start_utc", { ascending: true });
  });

  it("filters by pet when petId set", async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: "user-1" } }, error: null });
    setupSelectChain([]);
    await fetchVetBookings({ petId: validPet });
    expect(mockVetBookings.select).toHaveBeenCalled();
  });
});

describe("confirmVetBookingImport / dismissVetBookingImport", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetUser.mockResolvedValue({ data: { user: { id: "user-1" } }, error: null });
    mockSoftDeleteThread.mockResolvedValue(undefined);
  });

  it("confirm chains id and pending status then trashes linked thread", async () => {
    const maybeSingle = jest.fn().mockResolvedValue({
      data: {
        id: "bid-1",
        pet_id: "pet-1",
        user_id: "user-1",
        service_label: "Checkup",
        created_at: "2026-07-20T12:00:00.000Z",
        thread_message_id: "msg-1",
      },
      error: null,
    });
    const loadEq2 = jest.fn(() => ({ maybeSingle }));
    const loadEq1 = jest.fn(() => ({ eq: loadEq2 }));
    mockVetBookings.select = jest.fn(() => ({ eq: loadEq1 }));

    const innerEq = jest.fn().mockResolvedValue({ error: null });
    const outerEq = jest.fn(() => ({ eq: innerEq }));
    mockVetBookings.update = jest.fn(() => ({ eq: outerEq }));

    const msgMaybe = jest.fn().mockResolvedValue({
      data: { thread_id: "thread-1" },
      error: null,
    });
    mockThreadMessages.select = jest.fn(() => ({
      eq: jest.fn(() => ({ maybeSingle: msgMaybe })),
    }));

    await confirmVetBookingImport("bid-1");
    expect(mockVetBookings.update).toHaveBeenCalledWith({ status: "confirmed" });
    expect(outerEq).toHaveBeenCalledWith("id", "bid-1");
    expect(innerEq).toHaveBeenCalledWith("status", "pending_confirmation");
    expect(mockSoftDeleteThread).toHaveBeenCalledWith("thread-1");
  });

  it("dismiss sets cancelled and trashes invite via subject fallback when unlinked", async () => {
    const maybeSingle = jest.fn().mockResolvedValue({
      data: {
        id: "bid-2",
        pet_id: "pet-1",
        user_id: "user-1",
        service_label: "Milo invite",
        created_at: "2026-07-12T15:34:20.000Z",
        thread_message_id: null,
      },
      error: null,
    });
    mockVetBookings.select = jest.fn(() => ({
      eq: jest.fn(() => ({ maybeSingle })),
    }));
    const eq = jest.fn().mockResolvedValue({ error: null });
    mockVetBookings.update = jest.fn(() => ({ eq }));

    const is = jest.fn().mockResolvedValue({
      data: [
        {
          id: "thread-invite",
          subject: "Invitation: Milo invite @ Mon Jul 13",
          created_at: "2026-05-31T15:40:35.000Z",
        },
      ],
      error: null,
    });
    const eqUser = jest.fn(() => ({ is }));
    const eqPet = jest.fn(() => ({ eq: eqUser }));
    mockMessageThreads.select = jest.fn(() => ({ eq: eqPet }));

    await dismissVetBookingImport("bid-2");
    expect(mockVetBookings.update).toHaveBeenCalledWith({ status: "cancelled" });
    expect(eq).toHaveBeenCalledWith("id", "bid-2");
    expect(mockSoftDeleteThread).toHaveBeenCalledWith("thread-invite");
  });
});
