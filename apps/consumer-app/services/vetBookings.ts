import type { VetBookingServiceId } from "@/constants/vetBookingServices";
import type { Tables } from "@/database.types";
import { softDeleteThread } from "@/services/messages";
import { pickInviteThreadForBooking } from "@/utils/inviteThreadMatch";
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

/** Confirm a pending email ICS import so reminders apply; move linked inbox thread to Trash. */
export async function confirmVetBookingImport(bookingId: string): Promise<boolean> {
  const { data: booking, error: loadError } = await supabase
    .from("vet_bookings")
    .select("id, pet_id, user_id, service_label, created_at, thread_message_id")
    .eq("id", bookingId)
    .eq("status", "pending_confirmation")
    .maybeSingle();

  if (loadError || !booking) {
    console.warn("[vetBookings] confirm import load failed", loadError?.message);
    return false;
  }

  const { error } = await supabase
    .from("vet_bookings")
    .update({ status: "confirmed" })
    .eq("id", bookingId)
    .eq("status", "pending_confirmation");

  if (error) {
    console.warn("[vetBookings] confirm import failed", error.message);
    return false;
  }

  await softDeleteInviteThreadForBooking(booking);
  return true;
}

/** Dismiss / cancel an email ICS import the user does not want on the calendar. */
export async function dismissVetBookingImport(bookingId: string): Promise<boolean> {
  const { data: booking, error: loadError } = await supabase
    .from("vet_bookings")
    .select("id, pet_id, user_id, service_label, created_at, thread_message_id")
    .eq("id", bookingId)
    .maybeSingle();

  if (loadError) {
    console.warn("[vetBookings] dismiss import load failed", loadError.message);
  }

  const { error } = await supabase
    .from("vet_bookings")
    .update({ status: "cancelled" })
    .eq("id", bookingId);

  if (error) {
    console.warn("[vetBookings] dismiss import failed", error.message);
    return false;
  }

  if (booking) {
    await softDeleteInviteThreadForBooking(booking);
  }
  return true;
}

type BookingInviteLink = {
  pet_id: string | null;
  user_id: string;
  service_label: string | null;
  created_at: string;
  thread_message_id: string | null;
};

/** Outlook-style: after accept/decline, move the calendar invite email to Trash. */
async function softDeleteInviteThreadForBooking(booking: BookingInviteLink): Promise<void> {
  try {
    const threadId = await resolveInviteThreadId(booking);
    if (threadId) {
      await softDeleteThread(threadId);
    }
  } catch (e) {
    console.warn(
      "[vetBookings] could not move invite thread to Trash",
      e instanceof Error ? e.message : e,
    );
  }
}

async function resolveInviteThreadId(booking: BookingInviteLink): Promise<string | null> {
  if (booking.thread_message_id) {
    const { data: msg } = await supabase
      .from("thread_messages")
      .select("thread_id")
      .eq("id", booking.thread_message_id)
      .maybeSingle();
    if (msg?.thread_id) return msg.thread_id;
  }

  if (!booking.pet_id) return null;

  const { data: threads, error } = await supabase
    .from("message_threads")
    .select("id, subject, created_at")
    .eq("pet_id", booking.pet_id)
    .eq("user_id", booking.user_id)
    .is("deleted_at", null);

  if (error) {
    console.warn("[vetBookings] invite thread fallback query failed", error.message);
    return null;
  }

  return pickInviteThreadForBooking(
    { service_label: booking.service_label, created_at: booking.created_at },
    threads ?? [],
  );
}

function isUuid(s: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(s);
}
