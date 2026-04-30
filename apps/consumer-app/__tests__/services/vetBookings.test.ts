let mockGetUser: jest.Mock;
const mockVetBookings = { insert: jest.fn() };

jest.mock("@/utils/supabase", () => {
  mockGetUser = jest.fn();
  return {
    supabase: {
      auth: { getUser: mockGetUser },
      from: jest.fn((t: string) => {
        if (t === "vet_bookings") return mockVetBookings;
        throw new Error(t);
      }),
    },
  };
});

import { insertVetBooking } from "@/services/vetBookings";

function chainInsertId(result: { data: { id: string } | null; error: Error | null }) {
  const single = jest.fn().mockResolvedValue(result);
  const select = jest.fn().mockReturnValue({ single });
  const insert = jest.fn().mockReturnValue({ select });
  mockVetBookings.insert = insert;
  return insert;
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
