import { createClient } from "jsr:@supabase/supabase-js@2";
import {
  icsValueToIsoUtc,
  parseIcsCalendarToEvents,
  type ParsedIcsEvent,
} from "./icsParser.ts";
import { resolvePetHomeTimezone } from "./petTimezoneResolver.ts";
import type { ParsedAttachment, Pet } from "./types.ts";

function createSupabaseClient() {
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!supabaseUrl || !supabaseServiceKey) {
    throw new Error("Missing Supabase environment variables");
  }
  return createClient(supabaseUrl, supabaseServiceKey);
}

function base64ToUtf8(b64: string): string {
  const binary = atob(b64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return new TextDecoder("utf-8").decode(bytes);
}

export function isCalendarAttachment(a: ParsedAttachment): boolean {
  const mime = (a.mimeType || "").toLowerCase();
  const fn = (a.filename || "").toLowerCase();
  return (
    mime.includes("text/calendar") ||
    mime === "application/ics" ||
    fn.endsWith(".ics") ||
    fn.endsWith(".ical")
  );
}

function endFromStart(startIso: string, ev: ParsedIcsEvent, homeTimezone: string): string {
  if (ev.dtendRaw) {
    const endIso = icsValueToIsoUtc(
      "DTEND",
      ev.dtendProp.replace(/^DTEND/i, ""),
      ev.dtendRaw,
      homeTimezone
    );
    if (endIso) return endIso;
  }
  const start = new Date(startIso);
  if (!Number.isNaN(start.getTime())) {
    return new Date(start.getTime() + 3600000).toISOString();
  }
  return new Date().toISOString();
}

export type IcsImportResult = {
  filename: string;
  vetBookingIds: string[];
  errors: string[];
};

export type IcsImportBatchResult = {
  results: IcsImportResult[];
  /** Rows newly inserted this run (excludes idempotent skips). */
  newlyInsertedCount: number;
};

export async function importIcsAttachmentsToVetBookings(params: {
  pet: Pet;
  attachments: ParsedAttachment[];
  fileKey: string;
  threadMessageId: string | null;
}): Promise<IcsImportBatchResult> {
  const results: IcsImportResult[] = [];
  const supabase = createSupabaseClient();
  let newlyInsertedCount = 0;
  const homeTimezone = await resolvePetHomeTimezone(params.pet.id);

  for (const att of params.attachments) {
    const one: IcsImportResult = { filename: att.filename, vetBookingIds: [], errors: [] };
    let icsText: string;
    try {
      icsText = base64ToUtf8(att.content);
    } catch (e) {
      one.errors.push(e instanceof Error ? e.message : String(e));
      results.push(one);
      continue;
    }

    const events = parseIcsCalendarToEvents(icsText);
    if (events.length === 0) {
      one.errors.push("No parseable VEVENT with DTSTART");
      results.push(one);
      continue;
    }

    for (let idx = 0; idx < events.length; idx++) {
      const ev = events[idx];
      const startIso = icsValueToIsoUtc(
        "DTSTART",
        ev.dtstartProp.replace(/^DTSTART/i, ""),
        ev.dtstartRaw ?? "",
        homeTimezone
      );
      if (!startIso) {
        one.errors.push(`Event ${idx}: invalid DTSTART`);
        continue;
      }
      const endIso = endFromStart(startIso, ev, homeTimezone);
      const uidPart = ev.uid?.trim() || `noid-${idx}`;
      const emailImportKey = `${params.fileKey}:${uidPart}:${idx}`;

      const summary = ev.summary?.slice(0, 500) ?? "Appointment";
      const notesParts = [ev.description, ev.location].filter(Boolean);
      const notes = notesParts.length > 0 ? notesParts.join("\n\n").slice(0, 8000) : null;

      const row = {
        user_id: params.pet.user_id,
        pet_id: params.pet.id,
        clinic_id: "email_import",
        clinic_name: ev.location?.slice(0, 500) ?? null,
        service_id: "calendar_invite",
        service_label: summary.slice(0, 300),
        start_utc: startIso,
        end_utc: endIso,
        external_appointment_id: null,
        pawbuck_appointment_id: null,
        status: "pending_confirmation",
        notes,
        booking_source: "email_ics",
        ics_uid: ev.uid,
        email_import_key: emailImportKey,
        thread_message_id: params.threadMessageId,
      };

      const { data: existing } = await supabase
        .from("vet_bookings")
        .select("id")
        .eq("email_import_key", emailImportKey)
        .maybeSingle();

      if (existing?.id) {
        one.vetBookingIds.push(existing.id as string);
        continue;
      }

      const { data, error } = await supabase
        .from("vet_bookings")
        .insert(row)
        .select("id")
        .single();

      if (error) {
        if (error.code === "23505") {
          const { data: again } = await supabase
            .from("vet_bookings")
            .select("id")
            .eq("email_import_key", emailImportKey)
            .maybeSingle();
          if (again?.id) one.vetBookingIds.push(again.id as string);
        } else {
          console.error("[icsVetBookingImport] insert error", error);
          one.errors.push(error.message);
        }
      } else if (data?.id) {
        one.vetBookingIds.push(data.id as string);
        newlyInsertedCount++;
      }
    }
    results.push(one);
  }

  return { results, newlyInsertedCount };
}
