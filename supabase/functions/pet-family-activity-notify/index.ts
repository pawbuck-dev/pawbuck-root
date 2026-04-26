/**
 * Fan-out Expo push for pet_activity_events rows. Invoke from Database Webhook (INSERT) on
 * public.pet_activity_events with header x-pet-activity-secret matching PET_ACTIVITY_NOTIFY_SECRET.
 *
 * Body: Supabase webhook shape { type, table, record } or { eventId } for manual calls.
 */
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { errorResponse, handleCorsRequest, jsonResponse } from "../_shared/cors.ts";
import { createSupabaseClient } from "../_shared/supabase-utils.ts";
import { sendNotificationToUser } from "../_shared/notification.ts";

const LIFECYCLE_KINDS = new Set([
  "invite_accepted",
  "role_changed",
  "access_revoked",
  "grant_added",
]);

type CareScope = "all" | "meds_only" | "journal_only" | "none";

type Prefs = {
  care_activity_scope: CareScope;
  lifecycle_push_enabled: boolean;
  care_push_enabled: boolean;
};

function defaultPrefs(): Prefs {
  return {
    care_activity_scope: "all",
    lifecycle_push_enabled: true,
    care_push_enabled: true,
  };
}

function isLifecycleKind(kind: string): boolean {
  return LIFECYCLE_KINDS.has(kind);
}

function careMatchesScope(kind: string, scope: CareScope): boolean {
  if (scope === "none") return false;
  if (scope === "all") return true;
  if (scope === "meds_only") return kind.startsWith("med_");
  if (scope === "journal_only") return kind.startsWith("journal_");
  return false;
}

function shouldPush(kind: string, prefs: Prefs): boolean {
  if (isLifecycleKind(kind)) {
    return prefs.lifecycle_push_enabled;
  }
  if (!prefs.care_push_enabled) return false;
  return careMatchesScope(kind, prefs.care_activity_scope);
}

function parseEventId(body: Record<string, unknown>): string | null {
  if (typeof body.eventId === "string" && body.eventId.trim()) {
    return body.eventId.trim();
  }
  const rec = body.record as Record<string, unknown> | undefined;
  if (rec && typeof rec.id === "string") return rec.id;
  return null;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return handleCorsRequest();
  }
  if (req.method !== "POST") {
    return errorResponse("Method not allowed", 405);
  }

  const expected = Deno.env.get("PET_ACTIVITY_NOTIFY_SECRET");
  const header = req.headers.get("x-pet-activity-secret") ?? "";
  if (!expected || header !== expected) {
    return errorResponse("Unauthorized", 401);
  }

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return errorResponse("Invalid JSON", 400);
  }

  const eventId = parseEventId(body);
  if (!eventId) {
    return errorResponse("Missing event id", 400);
  }

  const svc = createSupabaseClient();

  const { data: evt, error: evErr } = await svc
    .from("pet_activity_events")
    .select("id, pet_id, actor_id, kind, summary, created_at")
    .eq("id", eventId)
    .maybeSingle();

  if (evErr || !evt) {
    return errorResponse("Event not found", 404);
  }

  const petId = evt.pet_id as string;
  const actorId = evt.actor_id as string;
  const kind = evt.kind as string;
  const summary = evt.summary as string;

  const { data: pet, error: petErr } = await svc
    .from("pets")
    .select("id, name, user_id")
    .eq("id", petId)
    .maybeSingle();

  if (petErr || !pet?.user_id) {
    return errorResponse("Pet not found", 404);
  }

  const ownerId = pet.user_id as string;
  const petName = (pet.name as string) || "Pet";

  const { data: grants } = await svc
    .from("pet_family_grants")
    .select("grantee_id")
    .eq("pet_id", petId);

  const recipientSet = new Set<string>();
  recipientSet.add(ownerId);
  for (const g of grants ?? []) {
    const gid = (g as { grantee_id: string }).grantee_id;
    if (gid) recipientSet.add(gid);
  }
  recipientSet.delete(actorId);

  const recipientIds = [...recipientSet];
  if (recipientIds.length === 0) {
    return jsonResponse({ ok: true, pushed: 0, reason: "no_recipients" });
  }

  const { data: prefRows } = await svc
    .from("pet_family_notification_prefs")
    .select(
      "user_id, care_activity_scope, lifecycle_push_enabled, care_push_enabled"
    )
    .eq("pet_id", petId)
    .in("user_id", recipientIds);

  const prefByUser = new Map<string, Prefs>();
  for (const row of prefRows ?? []) {
    const r = row as {
      user_id: string;
      care_activity_scope: CareScope;
      lifecycle_push_enabled: boolean;
      care_push_enabled: boolean;
    };
    prefByUser.set(r.user_id, {
      care_activity_scope: r.care_activity_scope,
      lifecycle_push_enabled: r.lifecycle_push_enabled,
      care_push_enabled: r.care_push_enabled,
    });
  }

  let pushed = 0;
  for (const uid of recipientIds) {
    const prefs = prefByUser.get(uid) ?? defaultPrefs();
    if (!shouldPush(kind, prefs)) continue;

    await sendNotificationToUser(uid, {
      title: `${petName}`,
      body: summary.length > 180 ? `${summary.slice(0, 177)}…` : summary,
      data: {
        type: "pet_family_activity",
        pet_id: petId,
        event_id: eventId,
        kind,
      },
    });
    pushed++;
  }

  return jsonResponse({ ok: true, pushed });
});
