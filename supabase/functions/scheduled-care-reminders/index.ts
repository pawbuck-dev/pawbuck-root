/**
 * Scheduled care reminders (5.4): document expiry (insurance + travel) and vet appointment T-24h / T-1h.
 * Invoke on a schedule (e.g. Supabase cron every 15–60 min) with header:
 *   x-scheduled-care-reminders-secret: <SCHEDULED_CARE_REMINDERS_SECRET>
 */
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { errorResponse, handleCorsRequest, jsonResponse } from "../_shared/cors.ts";
import { createSupabaseClient } from "../_shared/supabase-utils.ts";
import { sendNotificationToUser } from "../_shared/notification.ts";

type PetDocRow = {
  id: string;
  pet_id: string;
  user_id: string;
  document_type: string;
  extracted_json: Record<string, unknown> | null;
  expiry_date: string | null;
  pets: { name: string } | null;
};

type VetRow = {
  id: string;
  user_id: string;
  pet_id: string | null;
  start_utc: string;
  clinic_name: string | null;
  pets: { name: string } | null;
};

function utcStartOfDay(d: Date): Date {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
}

function calendarDaysBetweenUtc(from: Date, to: Date): number {
  const a = utcStartOfDay(from).getTime();
  const b = utcStartOfDay(to).getTime();
  return Math.round((b - a) / 86400000);
}

function parseDocumentExpiryIso(row: PetDocRow): string | null {
  if (row.expiry_date && /^\d{4}-\d{2}-\d{2}$/.test(row.expiry_date)) {
    return row.expiry_date;
  }
  const j = row.extracted_json;
  if (!j || typeof j !== "object") return null;
  const primary = j["primaryDate"];
  if (typeof primary === "string") {
    const head = primary.slice(0, 10);
    if (/^\d{4}-\d{2}-\d{2}$/.test(head)) return head;
  }
  const facts = j["keyFacts"];
  if (!Array.isArray(facts)) return null;
  for (const f of facts) {
    if (!f || typeof f !== "object") continue;
    const o = f as Record<string, unknown>;
    const label = String(o.label ?? "").toLowerCase();
    const value = String(o.value ?? "");
    if (!/(expir|renewal|valid until|coverage end|policy end)/.test(label)) continue;
    const m = value.match(/(\d{4}-\d{2}-\d{2})/);
    if (m) return m[1] ?? null;
  }
  return null;
}

function verifySecret(req: Request): boolean {
  const expected = Deno.env.get("SCHEDULED_CARE_REMINDERS_SECRET");
  if (!expected) {
    console.error("SCHEDULED_CARE_REMINDERS_SECRET is not set");
    return false;
  }
  const header = req.headers.get("x-scheduled-care-reminders-secret");
  return header === expected;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return handleCorsRequest();
  if (req.method !== "POST") return errorResponse("Method not allowed", 405);
  if (!verifySecret(req)) return errorResponse("Unauthorized", 401);

  const supabase = createSupabaseClient();
  const now = new Date();
  let documentPushes = 0;
  let vetPushes = 0;

  const { data: docs, error: docErr } = await supabase
    .from("pet_documents")
    .select("id, pet_id, user_id, document_type, extracted_json, expiry_date, pets(name, deleted_at)")
    .in("document_type", ["insurance_policy", "travel_certificate"]);

  if (docErr) {
    console.error(docErr);
    return errorResponse(docErr.message, 500);
  }

  for (const raw of docs ?? []) {
    const row = raw as unknown as PetDocRow & {
      pets?: { name: string; deleted_at: string | null } | null;
    };
    if (row.pets?.deleted_at) continue;

    const expiryIso = parseDocumentExpiryIso(row);
    if (!expiryIso) continue;

    const expiry = new Date(`${expiryIso}T12:00:00.000Z`);
    if (Number.isNaN(expiry.getTime())) continue;

    const daysUntil = calendarDaysBetweenUtc(now, expiry);
    if (daysUntil < 0) continue;

    const { data: up } = await supabase
      .from("user_preferences")
      .select("document_expiry_push_enabled")
      .eq("user_id", row.user_id)
      .maybeSingle();

    if (up && up.document_expiry_push_enabled === false) continue;

    const buckets: Array<"30" | "7" | "1" | "0"> = ["30", "7", "1", "0"];
    for (const bucket of buckets) {
      const want = bucket === "30" ? 30 : bucket === "7" ? 7 : bucket === "1" ? 1 : 0;
      if (daysUntil !== want) continue;

      const { error: insErr } = await supabase.from("document_expiry_reminder_sent").insert({
        pet_document_id: row.id,
        bucket,
      });
      if (insErr) {
        if (insErr.code === "23505") continue;
        console.error("document_expiry_reminder_sent insert", insErr);
        continue;
      }

      const petName = row.pets?.name ?? "Your pet";
      const label = row.document_type === "travel_certificate" ? "Travel document" : "Insurance";
      const when =
        bucket === "30"
          ? "in 30 days"
          : bucket === "7"
            ? "in 7 days"
            : bucket === "1"
              ? "tomorrow"
              : "today";

      await sendNotificationToUser(row.user_id, {
        title: `${label} for ${petName}`,
        body: `Expires ${when} (${expiryIso}).`,
        data: {
          notificationKind: "document_expiry",
          petId: row.pet_id,
          url: `/(home)/health-record/${row.pet_id}`,
        },
      });
      documentPushes++;
    }
  }

  const isoNow = now.toISOString();
  const in23h = new Date(now.getTime() + 23 * 3600000).toISOString();
  const in25h = new Date(now.getTime() + 25 * 3600000).toISOString();
  const in50m = new Date(now.getTime() + 50 * 60000).toISOString();
  const in70m = new Date(now.getTime() + 70 * 60000).toISOString();

  const { data: vet24, error: v24e } = await supabase
    .from("vet_bookings")
    .select("id, user_id, pet_id, start_utc, clinic_name, pets(name)")
    .eq("status", "confirmed")
    .gte("start_utc", in23h)
    .lte("start_utc", in25h);

  if (v24e) console.error(v24e);

  const { data: vet1h, error: v1e } = await supabase
    .from("vet_bookings")
    .select("id, user_id, pet_id, start_utc, clinic_name, pets(name)")
    .eq("status", "confirmed")
    .gte("start_utc", in50m)
    .lte("start_utc", in70m);

  if (v1e) console.error(v1e);

  async function sendVetReminder(b: VetRow, window: "24h" | "1h") {
    const { data: up } = await supabase
      .from("user_preferences")
      .select("vet_appointment_reminder_push_enabled")
      .eq("user_id", b.user_id)
      .maybeSingle();

    if (up && up.vet_appointment_reminder_push_enabled === false) return;

    const { error: insErr } = await supabase.from("vet_booking_reminder_sent").insert({
      vet_booking_id: b.id,
      reminder_window: window,
    });
    if (insErr) {
      if (insErr.code === "23505") return;
      console.error("vet_booking_reminder_sent insert", insErr);
      return;
    }

    const petName = b.pets?.name ?? "Your pet";
    const clinic = b.clinic_name?.trim() || "the clinic";
    const title = window === "24h" ? `Vet visit tomorrow — ${petName}` : `Vet visit in about an hour — ${petName}`;
    const body =
      window === "24h"
        ? `Appointment at ${clinic}.`
        : `Heads up: appointment at ${clinic}.`;

    await sendNotificationToUser(b.user_id, {
      title,
      body,
      data: {
        notificationKind: "vet_appointment_reminder",
        petId: b.pet_id ?? "",
        url: "/(home)/book-vet-visit",
        vetBookingId: b.id,
        vetReminderWindow: window,
      },
    });
    vetPushes++;
  }

  for (const raw of vet24 ?? []) {
    await sendVetReminder(raw as unknown as VetRow, "24h");
  }
  for (const raw of vet1h ?? []) {
    await sendVetReminder(raw as unknown as VetRow, "1h");
  }

  return jsonResponse({
    ok: true,
    at: isoNow,
    documentExpiryPushes: documentPushes,
    vetAppointmentPushes: vetPushes,
  });
});
