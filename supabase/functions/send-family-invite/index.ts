/**
 * Send a 14-day pet family invite (Mailgun). Caller must be owner or admin on the pet.
 *
 * POST JSON (Authorization: Bearer JWT):
 * { "petId": "uuid", "email": "invitee@example.com", "role": "contributor" | "admin" | "view_only" }
 */
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { errorResponse, handleCorsRequest, jsonResponse } from "../_shared/cors.ts";
import {
  buildFamilyInviteAcceptUrl,
  buildFamilyInviteEmailBodies,
  isPetFamilyRole,
  looksLikeEmail,
  type PetFamilyRole,
} from "../_shared/familyInviteValidation.ts";
import { createSupabaseClient, createUserSupabaseClient } from "../_shared/supabase-utils.ts";
import { sendTransactionalEmailMailgun } from "../_shared/mailgun-transactional.ts";

const APP_URL = Deno.env.get("APP_URL") || "https://pawbuck.app";

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return handleCorsRequest();
  }
  if (req.method !== "POST") {
    return errorResponse("Method not allowed", 405);
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
  if (!supabaseUrl || !anonKey) {
    return errorResponse("Server misconfigured", 500);
  }

  const authHeader = req.headers.get("Authorization") ?? "";
  if (!authHeader.trim()) {
    return errorResponse("Unauthorized", 401);
  }

  const userClient = createUserSupabaseClient(authHeader);
  const {
    data: { user },
    error: userErr,
  } = await userClient.auth.getUser();
  if (userErr || !user) {
    return errorResponse("Unauthorized", 401);
  }

  let body: { petId?: string; email?: string; role?: string };
  try {
    body = await req.json();
  } catch {
    return errorResponse("Invalid JSON", 400);
  }

  const petId = body.petId?.trim();
  const emailRaw = body.email?.trim();
  const roleStr = (body.role ?? "contributor").trim();

  if (!petId || !emailRaw) {
    return errorResponse("Missing petId or email", 400);
  }
  if (!looksLikeEmail(emailRaw)) {
    return errorResponse("Invalid email", 400);
  }
  if (!isPetFamilyRole(roleStr)) {
    return errorResponse("Invalid role", 400);
  }

  const email = emailRaw.toLowerCase();

  const { data: callerRole, error: roleErr } = await userClient.rpc(
    "get_user_pet_role",
    { p_pet_id: petId }
  );
  if (roleErr) {
    console.error("[send-family-invite] get_user_pet_role", roleErr);
    return errorResponse("Failed to verify access", 500);
  }
  if (callerRole !== "owner" && callerRole !== "admin") {
    return errorResponse("Forbidden", 403);
  }

  const { data: slots, error: slotErr } = await userClient.rpc(
    "pet_family_slots_used",
    { p_pet_id: petId }
  );
  if (slotErr) {
    console.error("[send-family-invite] pet_family_slots_used", slotErr);
    return errorResponse("Failed to check member limit", 500);
  }
  if (slots == null) {
    return errorResponse("Forbidden", 403);
  }
  if (slots >= 5) {
    return errorResponse("Pet family member limit (5) reached", 409);
  }

  const svc = createSupabaseClient();
  const { data: petRow, error: petErr } = await svc
    .from("pets")
    .select("id, name, user_id")
    .eq("id", petId)
    .is("deleted_at", null)
    .maybeSingle();

  if (petErr || !petRow?.user_id) {
    return errorResponse("Pet not found", 404);
  }

  const ownerId = petRow.user_id as string;
  const petName = (petRow.name as string) || "your pet";

  const { data: inviteeId, error: lookupErr } = await svc.rpc(
    "lookup_auth_user_id_by_email",
    { p_email: email }
  );
  if (lookupErr) {
    console.error("[send-family-invite] lookup_auth_user_id_by_email", lookupErr);
  }
  if (typeof inviteeId === "string" && inviteeId === ownerId) {
    return errorResponse("Cannot invite the pet owner as a grantee", 400);
  }

  const { data: inviterNameRow } = await svc
    .from("user_preferences")
    .select("full_name")
    .eq("user_id", user.id)
    .maybeSingle();
  const inviterDisplay =
    (inviterNameRow?.full_name as string | undefined)?.trim() ||
    user.email?.split("@")[0] ||
    "Someone";

  const { data: inserted, error: insErr } = await userClient
    .from("pet_family_invites")
    .insert({
      pet_id: petId,
      email,
      role: roleStr,
    })
    .select("id, token, expires_at")
    .single();

  if (insErr) {
    if (insErr.code === "23505") {
      return errorResponse("A pending invite already exists for this email", 409);
    }
    if (insErr.message?.includes("pet_family_member_limit")) {
      return errorResponse("Pet family member limit (5) reached", 409);
    }
    console.error("[send-family-invite] insert", insErr);
    return errorResponse(insErr.message ?? "Failed to create invite", 400);
  }

  const token = inserted?.token as string;
  const acceptUrl = buildFamilyInviteAcceptUrl(APP_URL, token);
  const { subject, text, html } = buildFamilyInviteEmailBodies({
    inviterDisplay,
    petName,
    acceptUrl,
  });

  const mail = await sendTransactionalEmailMailgun({
    to: email,
    subject,
    text,
    html,
  });
  if (!mail.ok && mail.reason === "mailgun_error") {
    console.warn("[send-family-invite] email failed but invite row exists", mail.detail);
  }

  return jsonResponse({
    ok: true,
    inviteId: inserted?.id,
    expiresAt: inserted?.expires_at,
    emailSent: mail.ok,
  });
});
