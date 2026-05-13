import type { VetBookingServiceId } from "@/constants/vetBookingServices";
import type { Tables } from "@/database.types";
import { supabase } from "@/utils/supabase";

export type VetBookingRow = Tables<"vet_bookings">;

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
    booking_source: "in_app" as const,
  };

  const { data, error } = await supabase.from("vet_bookings").insert(row).select("id").single();

  if (error) {
    console.warn("[vetBookings] insert failed", error.message);
    return null;
  }

  return data ? { id: data.id as string } : null;
}

export type FetchVetBookingsParams = {
  petId?: string | null;
  /** Only return rows with start_utc >= this ISO timestamp. */
  startAfterIso?: string;
};

/**
 * List vet bookings for the signed-in user (RLS also enforces ownership).
 * Excludes cancelled rows. Ordered by start time ascending.
 */
export async function fetchVetBookings(params?: FetchVetBookingsParams): Promise<VetBookingRow[]> {
  const { data: userData, error: userErr } = await supabase.auth.getUser();
  if (userErr || !userData.user) {
    console.warn("[vetBookings] fetchVetBookings: not authenticated");
    return [];
  }

  let q = supabase
    .from("vet_bookings")
    .select("*")
    .eq("user_id", userData.user.id)
    .neq("status", "cancelled");

  if (params?.petId) {
    q = q.eq("pet_id", params.petId);
  }
  if (params?.startAfterIso) {
    q = q.gte("start_utc", params.startAfterIso);
  }

  const { data, error } = await q.order("start_utc", { ascending: true });

  if (error) {
    console.warn("[vetBookings] fetch failed", error.message);
    return [];
  }

  return (data ?? []) as VetBookingRow[];
}

/** Confirm a pending email ICS import so reminders apply. */
export async function confirmVetBookingImport(bookingId: string): Promise<boolean> {
  const { error } = await supabase
    .from("vet_bookings")
    .update({ status: "confirmed" })
    .eq("id", bookingId)
    .eq("status", "pending_confirmation");

  if (error) {
    console.warn("[vetBookings] confirm import failed", error.message);
    return false;
  }
  return true;
}

/** Dismiss / cancel an email ICS import the user does not want on the calendar. */
export async function dismissVetBookingImport(bookingId: string): Promise<boolean> {
  const { error } = await supabase
    .from("vet_bookings")
    .update({ status: "cancelled" })
    .eq("id", bookingId);

  if (error) {
    console.warn("[vetBookings] dismiss import failed", error.message);
    return false;
  }
  return true;
}

function isUuid(s: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(s);
}
