// Permanently remove message threads that have been in Trash for more than 30 days.
// Health records (vaccinations, medications, etc.) are in separate tables and are NOT deleted.
// Invoke via cron with secret header for compliance audit trail.

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { corsHeaders, errorResponse, jsonResponse } from "../_shared/cors.ts";
import { createSupabaseClient } from "../_shared/supabase-utils.ts";

const DAYS_UNTIL_PERMANENT_DELETE = 30;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const cronSecret = Deno.env.get("PURGE_DELETED_THREADS_CRON_SECRET");
  if (cronSecret && req.headers.get("x-cron-secret") !== cronSecret) {
    return errorResponse("Unauthorized", 401);
  }

  const supabase = createSupabaseClient();
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - DAYS_UNTIL_PERMANENT_DELETE);
  const cutoffIso = cutoff.toISOString();

  const { data: threads, error: fetchError } = await supabase
    .from("message_threads")
    .select("id, deleted_by")
    .lt("deleted_at", cutoffIso)
    .not("deleted_at", "is", null);

  if (fetchError) {
    console.error("[purge-deleted-threads] Fetch error:", fetchError);
    return errorResponse(fetchError.message, 500);
  }

  if (!threads || threads.length === 0) {
    return jsonResponse({ purged: 0, message: "No threads to purge" });
  }

  let purged = 0;
  for (const thread of threads) {
    const { error: auditError } = await supabase
      .from("email_delete_audit")
      .insert({
        thread_id: thread.id,
        user_id: thread.deleted_by ?? null,
        action: "permanently_deleted",
      });

    if (auditError) {
      console.error(
        `[purge-deleted-threads] Audit insert failed for thread ${thread.id}:`,
        auditError
      );
      continue;
    }

    const { error: delMsgError } = await supabase
      .from("thread_messages")
      .delete()
      .eq("thread_id", thread.id);

    if (delMsgError) {
      console.error(
        `[purge-deleted-threads] Delete messages failed for thread ${thread.id}:`,
        delMsgError
      );
      continue;
    }

    const { error: delThreadError } = await supabase
      .from("message_threads")
      .delete()
      .eq("id", thread.id);

    if (delThreadError) {
      console.error(
        `[purge-deleted-threads] Delete thread failed for ${thread.id}:`,
        delThreadError
      );
      continue;
    }

    purged++;
  }

  return jsonResponse({
    purged,
    total: threads.length,
    cutoff: cutoffIso,
  });
});
