/**
 * Authenticated sync: reads RevenueCat subscriber via secret API key and upserts
 * `public.user_entitlements` so admin + server gates match store purchases when
 * webhooks are not yet configured.
 */
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import {
  corsHeaders,
  errorResponse,
  handleCorsRequest,
  jsonResponse,
} from "../_shared/cors.ts";
import {
  entitlementRowFromRevenueCatSubscriber,
  fetchRevenueCatSubscriber,
  isFoundingProductId,
} from "../_shared/revenuecatEntitlementSync.ts";
import { createSupabaseClient } from "../_shared/supabase-utils.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return handleCorsRequest();
  }

  if (req.method !== "POST") {
    return errorResponse("method not allowed", 405);
  }

  const authHeader = req.headers.get("Authorization");
  if (!authHeader) {
    return errorResponse("Unauthorized", 401);
  }

  const secretApiKey = Deno.env.get("REVENUECAT_SECRET_API_KEY")?.trim();
  if (!secretApiKey) {
    return errorResponse("server misconfigured: REVENUECAT_SECRET_API_KEY", 500);
  }

  const supabase = createSupabaseClient();
  const token = authHeader.replace(/^Bearer\s+/i, "");

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser(token);

  if (userError || !user) {
    return errorResponse("Unauthorized", 401);
  }

  const userId = user.id;

  const { data: existing } = await supabase
    .from("user_entitlements")
    .select("product_id, plan")
    .eq("user_id", userId)
    .maybeSingle();

  let subscriber;
  try {
    subscriber = await fetchRevenueCatSubscriber(userId, secretApiKey);
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    console.error("[revenuecat-sync-entitlement] fetch failed:", message);
    return errorResponse(message, 502);
  }

  const row = entitlementRowFromRevenueCatSubscriber(subscriber);

  if (existing?.product_id === "admin_grant" && row.plan === "free") {
    return jsonResponse({
      ok: true,
      skipped: true,
      reason: "preserve_admin_grant",
      plan: existing.plan ?? "free",
    });
  }

  if (row.is_founding_member && row.product_id && isFoundingProductId(row.product_id)) {
    const { data: ok, error: foundingErr } = await supabase.rpc("try_register_founding_purchase", {
      p_user_id: userId,
      p_plan: row.plan,
      p_product_id: row.product_id,
    });
    if (foundingErr) {
      return errorResponse(foundingErr.message, 500);
    }
    if (ok === false) {
      return errorResponse("founding_cap_reached", 409);
    }
  }

  const { error: upsertErr } = await supabase.from("user_entitlements").upsert(
    {
      user_id: userId,
      plan: row.plan,
      subscription_status: row.subscription_status,
      expires_at: row.expires_at,
      is_founding_member: row.is_founding_member,
      product_id: row.product_id,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id" }
  );

  if (upsertErr) {
    return errorResponse(upsertErr.message, 500);
  }

  return jsonResponse({ ok: true, plan: row.plan, isFounding: row.is_founding_member });
});
