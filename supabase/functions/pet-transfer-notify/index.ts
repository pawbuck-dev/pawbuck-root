/**
 * US-PT-006: pet transfer notifications (Expo push + Mailgun email).
 *
 * Product choices (v1):
 * - "In-app" = Expo push (no separate inbox table).
 * - Recipient targeting: optional `recipient_contact` email + lookup PawBuck user by email for push;
 *   codes remain the source of truth for acceptance.
 *
 * POST JSON:
 * - User JWT: { event: "created", transferId } | { event: "accepted", transferCode } | { event: "declined", transferCode }
 * - Cron: header `x-pet-transfer-cron-secret` must match PET_TRANSFER_CRON_SECRET; body { "event": "expire_due" }
 *
 * Schedule `expire_due` via Supabase Dashboard (Edge Functions → Schedules) or external cron hitting this URL.
 */
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "supabase";
import { errorResponse, handleCorsRequest, jsonResponse } from "../_shared/cors.ts";
import { looksLikeEmail } from "../_shared/familyInviteValidation.ts";
import {
  buildTransferAcceptedOwnerEmail,
  buildTransferCreatedOwnerEmail,
  buildTransferCreatedRecipientEmail,
  buildTransferDeclinedOwnerEmail,
  buildTransferPushData,
} from "../_shared/petTransferNotifyCopy.ts";
import { createSupabaseClient } from "../_shared/supabase-utils.ts";
import { sendNotificationToUser } from "../_shared/notification.ts";

const APP_URL = Deno.env.get("APP_URL") || "https://app.pawbuck.app";

async function sendTransactionalEmail(
  to: string,
  subject: string,
  textBody: string
): Promise<void> {
  const apiKey = Deno.env.get("MAILGUN_API_KEY");
  const domain = Deno.env.get("MAIL_DOMAIN");
  const from =
    Deno.env.get("PAWBUCK_NOTIFICATIONS_FROM") ||
    (domain ? `notifications@${domain}` : "");

  if (!apiKey || !domain || !from) {
    console.warn("[pet-transfer-notify] Mailgun not configured; skip email");
    return;
  }

  const formData = new FormData();
  formData.append("from", `PawBuck <${from}>`);
  formData.append("to", to.trim());
  formData.append("subject", subject);
  formData.append("text", textBody);

  const mailgunUrl = `https://api.mailgun.net/v3/${domain}/messages`;
  const res = await fetch(mailgunUrl, {
    method: "POST",
    headers: { Authorization: `Basic ${btoa(`api:${apiKey}`)}` },
    body: formData,
  });
  if (!res.ok) {
    const errText = await res.text();
    console.error("[pet-transfer-notify] Mailgun error", res.status, errText);
  }
}

async function getUserEmail(
  svc: ReturnType<typeof createSupabaseClient>,
  userId: string
): Promise<string | null> {
  const { data, error } = await svc.rpc("lookup_auth_email_by_id", {
    p_user_id: userId,
  });
  if (error) {
    console.error("[pet-transfer-notify] lookup_auth_email_by_id", error);
    return null;
  }
  const em = typeof data === "string" ? data : null;
  return em && looksLikeEmail(em) ? em : null;
}

async function resolveRecipientUserId(
  svc: ReturnType<typeof createSupabaseClient>,
  email: string
): Promise<string | null> {
  const { data, error } = await svc.rpc("lookup_auth_user_id_by_email", {
    p_email: email,
  });
  if (error) {
    console.error("[pet-transfer-notify] lookup_auth_user_id_by_email", error);
    return null;
  }
  return typeof data === "string" ? data : null;
}

async function handleCreated(
  svc: ReturnType<typeof createSupabaseClient>,
  userId: string,
  transferId: string
): Promise<Response> {
  const { data: row, error } = await svc
    .from("pet_transfers")
    .select("id, code, from_user_id, recipient_contact, pet_id, pets(name)")
    .eq("id", transferId)
    .single();

  if (error || !row) {
    return errorResponse("Transfer not found", 404);
  }
  if (row.from_user_id !== userId) {
    return errorResponse("Forbidden", 403);
  }

  const petName = (row.pets as { name?: string } | null)?.name ?? "your pet";
  const code = row.code as string;
  const hint = (row.recipient_contact as string | null)?.trim() ?? "";

  const ownerEmail = await getUserEmail(svc, userId);
  if (ownerEmail) {
    const { subject, text } = buildTransferCreatedOwnerEmail(petName, code, APP_URL);
    await sendTransactionalEmail(ownerEmail, subject, text);
  }
  await sendNotificationToUser(userId, {
    title: "Transfer code ready",
    body: `Share code ${code} for ${petName} with the new owner.`,
    data: buildTransferPushData("share", code),
  });

  if (hint && looksLikeEmail(hint)) {
    const recipientMail = buildTransferCreatedRecipientEmail(petName, code, APP_URL);
    await sendTransactionalEmail(hint, recipientMail.subject, recipientMail.text);
    const rid = await resolveRecipientUserId(svc, hint);
    if (rid && rid !== userId) {
      await sendNotificationToUser(rid, {
        title: "Pet transfer request",
        body: `${petName}: open PawBuck to review and accept (code ${code}).`,
        data: buildTransferPushData("review", code),
      });
    }
  }

  return jsonResponse({ ok: true });
}

async function handleAccepted(
  svc: ReturnType<typeof createSupabaseClient>,
  userId: string,
  transferCode: string
): Promise<Response> {
  const c = transferCode.trim().toUpperCase();
  const { data: row, error } = await svc
    .from("pet_transfers")
    .select("id, from_user_id, to_user_id, used_at, revoked_access_user_ids, pets(name)")
    .eq("code", c)
    .single();

  if (error || !row?.used_at || row.to_user_id !== userId) {
    return errorResponse("Transfer not found or not completed by this user", 404);
  }

  const petName = (row.pets as { name?: string } | null)?.name ?? "your pet";
  const ownerId = row.from_user_id as string;

  const ownerEmail = await getUserEmail(svc, ownerId);
  if (ownerEmail) {
    const mail = buildTransferAcceptedOwnerEmail(petName);
    await sendTransactionalEmail(ownerEmail, mail.subject, mail.text);
  }
  await sendNotificationToUser(ownerId, {
    title: "Transfer accepted",
    body: `${petName}'s new owner accepted the transfer.`,
    data: buildTransferPushData("accepted", c),
  });

  const revokedAccessUserIds = Array.isArray(row.revoked_access_user_ids)
    ? (row.revoked_access_user_ids as string[])
    : [];
  for (const revokedUserId of revokedAccessUserIds) {
    if (!revokedUserId || revokedUserId === ownerId || revokedUserId === userId) continue;
    await sendNotificationToUser(revokedUserId, {
      title: "Pet access removed",
      body: `Your access to ${petName} has been removed due to an ownership transfer.`,
      data: buildTransferPushData("access_revoked", undefined, petName),
    });
    const revokedEmail = await getUserEmail(svc, revokedUserId);
    if (revokedEmail) {
      await sendTransactionalEmail(
        revokedEmail,
        `Access removed: ${petName}`,
        `Your access to ${petName} has been removed due to an ownership transfer.`
      );
    }
  }

  return jsonResponse({ ok: true });
}

async function handleDeclined(
  svc: ReturnType<typeof createSupabaseClient>,
  userId: string,
  transferCode: string
): Promise<Response> {
  const c = transferCode.trim().toUpperCase();
  const { data: row, error } = await svc
    .from("pet_transfers")
    .select("id, from_user_id, declined_at, declined_by_user_id, pets(name)")
    .eq("code", c)
    .single();

  if (error || !row?.declined_at || row.declined_by_user_id !== userId) {
    return errorResponse("Declined transfer not found for this user", 404);
  }

  const petName = (row.pets as { name?: string } | null)?.name ?? "your pet";
  const ownerId = row.from_user_id as string;

  const ownerEmail = await getUserEmail(svc, ownerId);
  if (ownerEmail) {
    const mail = buildTransferDeclinedOwnerEmail(petName);
    await sendTransactionalEmail(ownerEmail, mail.subject, mail.text);
  }
  await sendNotificationToUser(ownerId, {
    title: "Transfer declined",
    body: `The recipient declined the transfer for ${petName}.`,
    data: buildTransferPushData("declined", c),
  });

  return jsonResponse({ ok: true });
}

async function handleExpireDue(svc: ReturnType<typeof createSupabaseClient>): Promise<Response> {
  const nowIso = new Date().toISOString();
  const { data: rows, error } = await svc
    .from("pet_transfers")
    .select("id, from_user_id, code, pet_id, pets(name)")
    .eq("is_active", true)
    .is("used_at", null)
    .not("expires_at", "is", null)
    .lt("expires_at", nowIso);

  if (error) {
    console.error("[pet-transfer-notify] expire query", error);
    return errorResponse(error.message, 500);
  }

  let n = 0;
  for (const r of rows ?? []) {
    const { error: upErr } = await svc
      .from("pet_transfers")
      .update({ is_active: false })
      .eq("id", r.id as string)
      .eq("is_active", true);

    if (upErr) {
      console.error("[pet-transfer-notify] expire update", upErr);
      continue;
    }

    const petName = (r.pets as { name?: string } | null)?.name ?? "your pet";
    const ownerId = r.from_user_id as string;
    const code = r.code as string;

    const ownerEmail = await getUserEmail(svc, ownerId);
    if (ownerEmail) {
      await sendTransactionalEmail(
        ownerEmail,
        `Pet transfer expired for ${petName}`,
        `The transfer code ${code} for ${petName} expired with no action. You can start a new transfer if needed.`
      );
    }
    await sendNotificationToUser(ownerId, {
      title: "Transfer expired",
      body: `The code for ${petName} expired with no response.`,
      data: buildTransferPushData("expired", code),
    });
    n++;
  }

  return jsonResponse({ ok: true, expiredCount: n });
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return handleCorsRequest();
  }
  if (req.method !== "POST") {
    return errorResponse("Method not allowed", 405);
  }

  const cronSecret = Deno.env.get("PET_TRANSFER_CRON_SECRET");
  const incomingCron = req.headers.get("x-pet-transfer-cron-secret");

  const svc = createSupabaseClient();

  if (cronSecret && incomingCron === cronSecret) {
    let body: { event?: string };
    try {
      body = await req.json();
    } catch {
      return errorResponse("Invalid JSON", 400);
    }
    if (body.event !== "expire_due") {
      return errorResponse("Invalid cron event", 400);
    }
    return handleExpireDue(svc);
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
  if (!supabaseUrl || !anonKey) {
    return errorResponse("Server misconfigured", 500);
  }

  const authHeader = req.headers.get("Authorization") ?? "";
  const userClient = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authHeader } },
  });
  const {
    data: { user },
    error: userErr,
  } = await userClient.auth.getUser();
  if (userErr || !user) {
    return errorResponse("Unauthorized", 401);
  }

  let body: { event?: string; transferId?: string; transferCode?: string };
  try {
    body = await req.json();
  } catch {
    return errorResponse("Invalid JSON", 400);
  }

  const ev = body.event;
  if (ev === "created" && body.transferId) {
    return handleCreated(svc, user.id, body.transferId);
  }
  if (ev === "accepted" && body.transferCode) {
    return handleAccepted(svc, user.id, body.transferCode);
  }
  if (ev === "declined" && body.transferCode) {
    return handleDeclined(svc, user.id, body.transferCode);
  }

  return errorResponse("Invalid body", 400);
});
