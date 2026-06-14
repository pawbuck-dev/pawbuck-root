// supabase/functions/delete-account/index.ts
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { corsHeaders, errorResponse, jsonResponse } from "../_shared/cors.ts";
import { createSupabaseClient } from "../_shared/supabase-utils.ts";

/**
 * Schedule or cancel account deletion (7-day grace). Hard purge runs in PawBuck.API AccountPurgeWorker.
 */
Deno.serve(async (req) => {
  const requestId = crypto.randomUUID().substring(0, 8);

  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return errorResponse("Unauthorized", 401);
    }

    const supabase = createSupabaseClient();
    const token = authHeader.replace("Bearer ", "");

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser(token);

    if (userError || !user) {
      return errorResponse("Unauthorized", 401);
    }

    let action = "schedule";
    if (req.method === "POST") {
      try {
        const body = await req.json();
        if (body?.action === "cancel") action = "cancel";
      } catch {
        // empty body → schedule
      }
    }

    const userId = user.id;
    console.log(`[${requestId}] delete-account action=${action} user=${userId}`);

    if (action === "cancel") {
      const { data, error } = await supabase.rpc("cancel_account_deletion", {
        p_user_id: userId,
      });
      if (error) {
        console.error(`[${requestId}] cancel failed:`, error);
        return errorResponse(error.message, 500);
      }
      return jsonResponse({ success: true, cancelled: data?.cancelled ?? false });
    }

    const { data, error } = await supabase.rpc("schedule_account_deletion", {
      p_user_id: userId,
      p_grace_days: 7,
    });

    if (error) {
      console.error(`[${requestId}] schedule failed:`, error);
      return errorResponse(error.message, 500);
    }

    return jsonResponse({
      success: true,
      scheduled: true,
      purge_after: data?.purge_after,
      grace_days: data?.grace_days ?? 7,
      message:
        "Account deletion scheduled. You have 7 days to cancel before your data is permanently removed.",
    });
  } catch (error) {
    console.error(`[${requestId}] delete-account error:`, error);
    const errorMessage =
      error instanceof Error ? error.message : "Internal server error";
    return errorResponse(errorMessage, 500);
  }
});
