/**
 * RevenueCat (or compatible) webhook: upserts `public.user_entitlements`.
 *
 * Configure in RevenueCat dashboard → Webhooks → URL: `https://<project>.supabase.co/functions/v1/revenuecat-webhook`
 * Set secret env `REVENUECAT_WEBHOOK_SECRET` (same value in RevenueCat webhook authorization if using Bearer).
 *
 * Expect `Authorization: Bearer <REVENUECAT_WEBHOOK_SECRET>`.
 * Use Supabase `auth.users.id` as RevenueCat `app_user_id` so rows align.
 */
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const corsHeaders: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "method not allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const secret = Deno.env.get("REVENUECAT_WEBHOOK_SECRET");
  const auth = req.headers.get("Authorization") ?? "";
  if (!secret || auth !== `Bearer ${secret}`) {
    return new Response(JSON.stringify({ error: "unauthorized" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  let body: Record<string, unknown>;
  try {
    body = (await req.json()) as Record<string, unknown>;
  } catch {
    return new Response(JSON.stringify({ error: "invalid json" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const evt = (body.event ?? body) as Record<string, unknown>;
  const appUserId = evt.app_user_id;
  const type = String(evt.type ?? "");

  if (typeof appUserId !== "string" || !appUserId) {
    return new Response(JSON.stringify({ error: "missing app_user_id" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!supabaseUrl || !serviceKey) {
    return new Response(JSON.stringify({ error: "server misconfigured" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const supabase = createClient(supabaseUrl, serviceKey);

  const premiumTypes = [
    "INITIAL_PURCHASE",
    "RENEWAL",
    "NON_RENEWING_PURCHASE",
    "PRODUCT_CHANGE",
    "UNCANCELLATION",
  ];
  const expireTypes = ["EXPIRATION"];

  let plan: "free" | "premium" = "free";
  let expiresAt: string | null = null;

  if (premiumTypes.includes(type)) {
    plan = "premium";
    const ms = evt.expiration_at_ms;
    if (typeof ms === "number") {
      expiresAt = new Date(ms).toISOString();
    }
  } else if (expireTypes.includes(type)) {
    plan = "free";
  }

  const { error } = await supabase.from("user_entitlements").upsert(
    {
      user_id: appUserId,
      plan,
      subscription_status: type || null,
      expires_at: expiresAt,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id" }
  );

  if (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  return new Response(JSON.stringify({ ok: true }), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
