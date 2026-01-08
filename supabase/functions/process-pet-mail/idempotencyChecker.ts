import { createClient } from "jsr:@supabase/supabase-js@2";

export type ProcessingStatus = "processing" | "completed";

export interface LockResult {
  acquired: boolean;
  status?: ProcessingStatus;
}

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

  // First, try to INSERT a new record with status='processing'
  const { error: insertError } = await supabase.from("processed_emails").insert({
    s3_key: s3Key,
    status: "processing",
  });

  // If insert succeeded, we acquired the lock
  if (!insertError) {
    console.log(`[MONITORING] 🔒 Acquired processing lock for: ${s3Key}`);
    return { acquired: true };
  }

  // If we got a duplicate key error (23505), check the existing record's status
  if (insertError.code === "23505") {
    console.log(`[MONITORING] ⚠️ Lock already exists for: ${s3Key}, checking status...`);
    
    const { data, error: selectError } = await supabase
      .from("processed_emails")
      .select("status, started_at")
      .eq("s3_key", s3Key)
      .single();

    if (selectError || !data) {
      console.error(`[MONITORING] ❌ Error checking existing lock status (s3Key: ${s3Key}):`, selectError);
      // Fail safe - don't process if we can't determine status
      return { acquired: false, status: "processing" };
    }

    const status = data.status as ProcessingStatus;
    const startedAt = data.started_at ? new Date(data.started_at).getTime() : null;
    const ageMs = startedAt ? Date.now() - startedAt : null;
    const ageMinutes = ageMs ? Math.floor(ageMs / 60000) : null;
    
    if (status === "processing" && ageMinutes && ageMinutes > 5) {
      console.warn(`[MONITORING] ⚠️ Email has been in 'processing' status for ${ageMinutes} minutes (s3Key: ${s3Key}) - may be stuck`);
    }
    
    console.log(`[MONITORING] Existing lock status: ${status}${ageMinutes ? ` (age: ${ageMinutes}m)` : ""}`);
    return { acquired: false, status };
  }

  // For other errors, log and fail open (allow processing)
  console.error("Error acquiring processing lock:", insertError);
  return { acquired: true }; // Fail open - allow processing on unexpected errors
}

/**
 * Marks email processing as completed.
 * Updates the existing record from 'processing' to 'completed'.
 * 
 * @param s3Key - The S3 key (fileKey) of the email
 * @param petId - The pet ID associated with the email
 * @param attachmentCount - Number of attachments processed
 * @param success - Whether processing was successful
 */
export async function markEmailAsCompleted(
  s3Key: string,
  petId: string,
  attachmentCount: number,
  success: boolean = true
): Promise<void> {
  const supabase = createSupabaseClient();

  console.log(`[MONITORING] Updating processed_emails: s3Key=${s3Key}, petId=${petId}, attachments=${attachmentCount}, success=${success}`);

  const { data, error } = await supabase
    .from("processed_emails")
    .update({
      status: "completed",
      pet_id: petId,
      attachment_count: attachmentCount,
      success,
      completed_at: new Date().toISOString(),
    })
    .eq("s3_key", s3Key)
    .select();

  if (error) {
    console.error(`[MONITORING] ❌ Error marking email as completed (s3Key: ${s3Key}):`, error);
    throw error;
  } else {
    const rowCount = data?.length || 0;
    if (rowCount === 0) {
      console.warn(`[MONITORING] ⚠️ No rows updated for s3Key: ${s3Key} (row may not exist)`);
    } else {
      console.log(`[MONITORING] ✅ Email marked as completed: ${s3Key} (${rowCount} row(s) updated)`);
    }
  }
}
