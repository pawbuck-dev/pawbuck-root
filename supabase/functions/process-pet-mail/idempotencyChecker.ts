import { createClient } from "jsr:@supabase/supabase-js@2";

export type ProcessingStatus = "processing" | "completed";

export type LockReason =
  | "duplicate_completed"
  | "in_progress"
  | "reclaimed"
  | "lock_error";

export interface LockResult {
  acquired: boolean;
  status?: ProcessingStatus;
  reason?: LockReason;
}

/** Stale processing locks older than this may be reclaimed by a new worker. */
export const STALE_PROCESSING_MS = 15 * 60 * 1000;

/**
 * Creates a Supabase client with service role key
 */
function createSupabaseClient() {
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

  if (!supabaseUrl || !supabaseServiceKey) {
    throw new Error("Missing Supabase environment variables");
  }

  return createClient(supabaseUrl, supabaseServiceKey);
}

async function tryReclaimStaleProcessingLock(
  supabase: ReturnType<typeof createSupabaseClient>,
  s3Key: string
): Promise<LockResult | null> {
  const staleBefore = new Date(Date.now() - STALE_PROCESSING_MS).toISOString();

  const { data, error } = await supabase
    .from("processed_emails")
    .update({ started_at: new Date().toISOString() })
    .eq("s3_key", s3Key)
    .eq("status", "processing")
    .lt("started_at", staleBefore)
    .select("s3_key");

  if (error) {
    console.error(`[MONITORING] Reclaim update failed (s3Key: ${s3Key}):`, error);
    return null;
  }

  if (data && data.length > 0) {
    console.log(`[MONITORING] 🔓 Reclaimed stale processing lock for: ${s3Key}`);
    return { acquired: true, reason: "reclaimed" };
  }

  return null;
}

/**
 * Attempts to acquire a processing lock for an email.
 * This uses INSERT to claim the lock - if another request already has it,
 * we'll get a duplicate key error.
 *
 * @param s3Key - The S3 key (fileKey) of the email
 * @returns LockResult - { acquired: true } if lock acquired,
 *                       { acquired: false, status } if already being processed or completed
 */
export async function tryAcquireProcessingLock(s3Key: string): Promise<LockResult> {
  const supabase = createSupabaseClient();

  const { error: insertError } = await supabase.from("processed_emails").insert({
    s3_key: s3Key,
    status: "processing",
  });

  if (!insertError) {
    console.log(`[MONITORING] 🔒 Acquired processing lock for: ${s3Key}`);
    return { acquired: true };
  }

  if (insertError.code === "23505") {
    console.log(`[MONITORING] ⚠️ Lock already exists for: ${s3Key}, checking status...`);

    const { data, error: selectError } = await supabase
      .from("processed_emails")
      .select("status, started_at")
      .eq("s3_key", s3Key)
      .single();

    if (selectError || !data) {
      console.error(`[MONITORING] ❌ Error checking existing lock status (s3Key: ${s3Key}):`, selectError);
      return { acquired: false, status: "processing", reason: "lock_error" };
    }

    const status = data.status as ProcessingStatus;
    const startedAt = data.started_at ? new Date(data.started_at).getTime() : null;
    const ageMs = startedAt ? Date.now() - startedAt : null;
    const ageMinutes = ageMs ? Math.floor(ageMs / 60000) : null;

    if (status === "processing") {
      const reclaimed = await tryReclaimStaleProcessingLock(supabase, s3Key);
      if (reclaimed) return reclaimed;

      if (ageMinutes && ageMinutes > 5) {
        console.warn(
          `[MONITORING] ⚠️ Email has been in 'processing' status for ${ageMinutes} minutes (s3Key: ${s3Key}) - may be stuck`
        );
      }
    }

    console.log(`[MONITORING] Existing lock status: ${status}${ageMinutes ? ` (age: ${ageMinutes}m)` : ""}`);
    return {
      acquired: false,
      status,
      reason: status === "completed" ? "duplicate_completed" : "in_progress",
    };
  }

  console.error("[MONITORING] Lock acquisition failed (fail-closed):", insertError);
  return { acquired: false, reason: "lock_error" };
}

/**
 * Marks email processing as completed.
 */
export async function markEmailAsCompleted(
  s3Key: string,
  petId: string,
  attachmentCount: number,
  success: boolean,
  failureReason?: string | null
): Promise<void> {
  const supabase = createSupabaseClient();

  console.log(
    `[MONITORING] Updating processed_emails: s3Key=${s3Key}, petId=${petId}, attachments=${attachmentCount}, success=${success}`
  );

  const updatePayload: Record<string, unknown> = {
    status: "completed",
    pet_id: petId,
    attachment_count: attachmentCount,
    success,
    completed_at: new Date().toISOString(),
  };

  if (!success && failureReason) {
    updatePayload.failure_reason = failureReason.slice(0, 2000);
  }

  const { data, error } = await supabase
    .from("processed_emails")
    .update(updatePayload)
    .eq("s3_key", s3Key)
    .select();

  if (error) {
    console.error(`[MONITORING] ❌ Error marking email as completed (s3Key: ${s3Key}):`, error);
    throw error;
  }

  const rowCount = data?.length || 0;
  if (rowCount === 0) {
    console.warn(`[MONITORING] ⚠️ No rows updated for s3Key: ${s3Key} (row may not exist)`);
  } else {
    console.log(`[MONITORING] ✅ Email marked as completed: ${s3Key} (${rowCount} row(s) updated)`);
  }
}
