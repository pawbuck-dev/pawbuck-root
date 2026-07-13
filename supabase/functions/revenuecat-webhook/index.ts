/**
 * RevenueCat (or compatible) webhook: upserts `public.user_entitlements`.
 */
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";
import {
  isFoundingProductId,
  resolvePlanFromWebhookEvent,
} from "../_shared/revenuecatEntitlementSync.ts";

const corsHeaders: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

type Plan = "free" | "individual" | "family";

function isFoundingProduct(evt: Record<string, unknown>): boolean {
  const productId = String(evt.product_id ?? evt.product_identifier ?? "");
  return isFoundingProductId(productId);
}

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

  let plan: Plan = "free";
  let expiresAt: string | null = null;
  let isFounding = false;
  const productId = String(evt.product_id ?? evt.product_identifier ?? "") || null;

  if (premiumTypes.includes(type)) {
    const resolved = resolvePlanFromWebhookEvent(evt);
    plan = resolved ?? "individual";
    isFounding = isFoundingProduct(evt) || type === "NON_RENEWING_PURCHASE";

    if (isFounding) {
      const { data: ok, error: foundingErr } = await supabase.rpc("try_register_founding_purchase", {
        p_user_id: appUserId,
        p_plan: plan,
        p_product_id: productId,
      });
      if (foundingErr) {
        return new Response(JSON.stringify({ error: foundingErr.message }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (ok === false) {
        return new Response(JSON.stringify({ error: "founding_cap_reached" }), {
          status: 409,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      expiresAt = null;
    } else {
      const ms = evt.expiration_at_ms;
      if (typeof ms === "number") {
        expiresAt = new Date(ms).toISOString();
      }
    }
  } else if (expireTypes.includes(type)) {
    const { data: existing } = await supabase
      .from("user_entitlements")
      .select("product_id")
      .eq("user_id", appUserId)
      .maybeSingle();

    if (existing?.product_id === "admin_grant") {
      return new Response(JSON.stringify({ ok: true, skipped: true, reason: "preserve_admin_grant" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    plan = "free";
    isFounding = false;
  } else {
    return new Response(JSON.stringify({ ok: true, skipped: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const { error } = await supabase.from("user_entitlements").upsert(
    {
      user_id: appUserId,
      plan,
      subscription_status: type || null,
      expires_at: expiresAt,
      is_founding_member: isFounding,
      product_id: productId,
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

  return new Response(JSON.stringify({ ok: true, plan, isFounding }), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
