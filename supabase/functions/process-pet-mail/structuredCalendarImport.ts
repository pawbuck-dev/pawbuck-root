import { createClient } from "jsr:@supabase/supabase-js@2";
import type { StructuredCalendarInvite } from "./googleCalendarInviteExtract.ts";
import type { Pet } from "./types.ts";

function createSupabaseClient() {
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!supabaseUrl || !supabaseServiceKey) {
    throw new Error("Missing Supabase environment variables");
  }
  return createClient(supabaseUrl, supabaseServiceKey);
}

function defaultEndUtc(startUtc: string): string {
  const start = new Date(startUtc);
  if (Number.isNaN(start.getTime())) return new Date(Date.now() + 3600000).toISOString();
  return new Date(start.getTime() + 3600000).toISOString();
}

export type StructuredCalendarImportBatchResult = {
  newlyInsertedCount: number;
  vetBookingIds: string[];
};

export async function importStructuredCalendarInviteToVetBookings(params: {
  pet: Pet;
  invite: StructuredCalendarInvite;
  fileKey: string;
  threadMessageId: string | null;
}): Promise<StructuredCalendarImportBatchResult> {
  const supabase = createSupabaseClient();
  const endUtc = params.invite.endUtc ?? defaultEndUtc(params.invite.startUtc);
  const emailImportKey = `${params.fileKey}:google:${params.invite.source}:${params.invite.startUtc}`;

  const { data: existing } = await supabase
    .from("vet_bookings")
    .select("id")
    .eq("email_import_key", emailImportKey)
    .maybeSingle();

  if (existing?.id) {
    return {
      newlyInsertedCount: 0,
      vetBookingIds: [existing.id as string],
    };
  }

  const row = {
    user_id: params.pet.user_id,
    pet_id: params.pet.id,
    clinic_id: "email_import",
    clinic_name: params.invite.location,
    service_id: "calendar_invite",
    service_label: params.invite.summary.slice(0, 300),
    start_utc: params.invite.startUtc,
    end_utc: endUtc,
    external_appointment_id: null,
    pawbuck_appointment_id: null,
    status: "pending_confirmation",
    notes: `Imported from Google Calendar (${params.invite.source})`,
    booking_source: "email_ics",
    ics_uid: null,
    email_import_key: emailImportKey,
    thread_message_id: params.threadMessageId,
  };

  const { data, error } = await supabase.from("vet_bookings").insert(row).select("id").single();

  if (error) {
    if (error.code === "23505") {
      const { data: again } = await supabase
        .from("vet_bookings")
        .select("id")
        .eq("email_import_key", emailImportKey)
        .maybeSingle();
      return {
        newlyInsertedCount: 0,
        vetBookingIds: again?.id ? [again.id as string] : [],
      };
    }
    throw error;
  }

  return {
    newlyInsertedCount: data?.id ? 1 : 0,
    vetBookingIds: data?.id ? [data.id as string] : [],
  };
}
