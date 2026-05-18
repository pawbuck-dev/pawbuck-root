import { createClient } from "jsr:@supabase/supabase-js@2";
import { resolveAppointmentUtcRange } from "./appointmentTime.ts";
import { shouldAttemptNlpAppointmentImport } from "./emailBodyForNlp.ts";
import { extractNlpAppointmentFromEmail } from "./nlpAppointmentExtractor.ts";
import {
  buildNlpEmailImportKey,
  formatServiceLabelForStorage,
  shouldPersistNlpExtraction,
  type NlpAppointmentExtraction,
} from "./nlpAppointmentTypes.ts";
import { resolveEmailReferenceYear } from "./emailReferenceTime.ts";
import { resolvePetHomeTimezone } from "./petTimezoneResolver.ts";
import type { ParsedEmail, Pet } from "./types.ts";

function createSupabaseClient() {
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!supabaseUrl || !supabaseServiceKey) {
    throw new Error("Missing Supabase environment variables");
  }
  return createClient(supabaseUrl, supabaseServiceKey);
}

export type NlpImportBatchResult = {
  newlyInsertedCount: number;
  vetBookingId: string | null;
  skippedReason: string | null;
};

export type RunNlpImportParams = {
  parsedEmail: ParsedEmail;
  pet: Pet;
  senderEmail: string;
  fileKey: string;
  threadMessageId: string | null;
  hasCalendarAttachments: boolean;
  referenceYear?: number;
};

/**
 * NLP calendar fallback when no ICS attachments. Returns count of new vet_bookings rows.
 */
export async function runNlpAppointmentImportIfEligible(
  params: RunNlpImportParams
): Promise<NlpImportBatchResult> {
  if (!shouldAttemptNlpAppointmentImport(params.parsedEmail, params.hasCalendarAttachments)) {
    return { newlyInsertedCount: 0, vetBookingId: null, skippedReason: "not_eligible" };
  }

  const homeTimezone = await resolvePetHomeTimezone(params.pet.id);
  const extraction = await extractNlpAppointmentFromEmail({
    parsedEmail: params.parsedEmail,
    pet: params.pet,
    senderEmail: params.senderEmail,
    homeTimezone,
    referenceYear: params.referenceYear ?? resolveEmailReferenceYear(params.parsedEmail.date),
  });

  return importNlpAppointmentToVetBookings({
    pet: params.pet,
    extraction,
    homeTimezone,
    fileKey: params.fileKey,
    messageId: params.parsedEmail.messageId,
    threadMessageId: params.threadMessageId,
  });
}

export async function importNlpAppointmentToVetBookings(params: {
  pet: Pet;
  extraction: NlpAppointmentExtraction;
  homeTimezone: string;
  fileKey: string;
  messageId: string | null;
  threadMessageId: string | null;
}): Promise<NlpImportBatchResult> {
  if (!shouldPersistNlpExtraction(params.extraction)) {
    return {
      newlyInsertedCount: 0,
      vetBookingId: null,
      skippedReason: "below_threshold_or_not_found",
    };
  }

  const range = resolveAppointmentUtcRange(params.extraction, params.homeTimezone);
  if (!range) {
    return { newlyInsertedCount: 0, vetBookingId: null, skippedReason: "invalid_datetime" };
  }

  const emailImportKey = buildNlpEmailImportKey(params.messageId, params.fileKey);
  const supabase = createSupabaseClient();

  const { data: existing } = await supabase
    .from("vet_bookings")
    .select("id")
    .eq("email_import_key", emailImportKey)
    .maybeSingle();

  if (existing?.id) {
    return {
      newlyInsertedCount: 0,
      vetBookingId: existing.id as string,
      skippedReason: "duplicate",
    };
  }

  const serviceLabel = formatServiceLabelForStorage(
    params.extraction.category,
    params.extraction.service_label
  );
  const clinicName = params.extraction.provider_name?.slice(0, 500) || null;

  const row = {
    user_id: params.pet.user_id,
    pet_id: params.pet.id,
    clinic_id: "email_import",
    clinic_name: clinicName,
    service_id: "email_nlp",
    service_label: serviceLabel,
    start_utc: range.startUtc,
    end_utc: range.endUtc,
    external_appointment_id: null,
    pawbuck_appointment_id: null,
    status: "pending_confirmation",
    notes: params.extraction.notes,
    booking_source: "email_nlp",
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
        vetBookingId: (again?.id as string) ?? null,
        skippedReason: "duplicate",
      };
    }
    console.error("[nlpAppointmentImport] insert error", error);
    return { newlyInsertedCount: 0, vetBookingId: null, skippedReason: error.message };
  }

  return {
    newlyInsertedCount: data?.id ? 1 : 0,
    vetBookingId: (data?.id as string) ?? null,
    skippedReason: null,
  };
}
