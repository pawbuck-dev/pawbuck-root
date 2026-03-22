import type { VetBookingServiceId } from "@/constants/vetBookingServices";
import { supabase } from "@/utils/supabase";

export type InsertVetBookingInput = {
  petId: string | null;
  clinicId: string;
  clinicName: string | null;
  serviceId: VetBookingServiceId | string;
  serviceLabel: string;
  startUtc: string;
  endUtc: string;
  externalAppointmentId: string;
  pawbuckAppointmentId: string | null;
  notes?: string | null;
};

/**
 * Persist a booking row after PawBuck.API returns success. Requires authenticated user.
 */
export async function insertVetBooking(input: InsertVetBookingInput): Promise<{ id: string } | null> {
  const { data: userData, error: userErr } = await supabase.auth.getUser();
  if (userErr || !userData.user) {
    console.warn("[vetBookings] No authenticated user; skipping persist");
    return null;
  }

  const row = {
    user_id: userData.user.id,
    pet_id: input.petId && isUuid(input.petId) ? input.petId : null,
    clinic_id: input.clinicId,
    clinic_name: input.clinicName,
    service_id: input.serviceId,
    service_label: input.serviceLabel,
    start_utc: input.startUtc,
    end_utc: input.endUtc,
    external_appointment_id: input.externalAppointmentId,
    pawbuck_appointment_id: input.pawbuckAppointmentId && isUuid(input.pawbuckAppointmentId) ? input.pawbuckAppointmentId : null,
    status: "confirmed",
    notes: input.notes ?? null,
  };

  const { data, error } = await supabase.from("vet_bookings").insert(row).select("id").single();

  if (error) {
    console.warn("[vetBookings] insert failed", error.message);
    return null;
  }

  return data ? { id: data.id as string } : null;
}

function isUuid(s: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(s);
}
