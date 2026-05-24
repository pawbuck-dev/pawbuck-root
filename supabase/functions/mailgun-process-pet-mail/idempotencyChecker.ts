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

export const STALE_PROCESSING_MS = 15 * 60 * 1000;

/**
 * Email metadata to store when acquiring a processing lock
 */
export interface EmailMetadata {
  senderEmail?: string;
  subject?: string;
}

/**
 * Options for marking email as completed
 */
export interface CompletionOptions {
  documentType?: string;
  failureReason?: string;
  /** When processing succeeds after user review, mark inbox row resolved */
  reviewStatus?: "pending" | "resolved" | "dismissed";
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

async function tryReclaimStaleProcessingLock(
  supabase: ReturnType<typeof createSupabaseClient>,
  emailKey: string,
): Promise<LockResult | null> {
  const staleBefore = new Date(Date.now() - STALE_PROCESSING_MS).toISOString();

  const { data, error } = await supabase
    .from("processed_emails")
    .update({ started_at: new Date().toISOString() })
    .eq("s3_key", emailKey)
    .eq("status", "processing")
    .lt("started_at", staleBefore)
    .select("s3_key");

  if (error) {
    console.error(`[MONITORING] Reclaim update failed (emailKey: ${emailKey}):`, error);
    return null;
  }

  if (data && data.length > 0) {
    console.log(`[MONITORING] Reclaimed stale processing lock for: ${emailKey}`);
    return { acquired: true, reason: "reclaimed" };
  }

  return null;
}

/**
 * Attempts to acquire a processing lock for an email.
 * This uses INSERT to claim the lock - if another request already has it,
 * we'll get a duplicate key error.
 * 
 * @param emailKey - The unique email identifier (Message-Id for Mailgun, S3 key for SES)
 * @param metadata - Optional email metadata to store (sender, subject)
 * @returns LockResult - { acquired: true } if lock acquired, 
 *                       { acquired: false, status } if already being processed or completed
 */
export async function tryAcquireProcessingLock(
  emailKey: string,
  metadata?: EmailMetadata
): Promise<LockResult> {
  const supabase = createSupabaseClient();

  // Build insert data with optional metadata
  const insertData: Record<string, unknown> = {
    s3_key: emailKey, // Reusing s3_key column for generic email identifier
    status: "processing",
  };

  // Add metadata if provided
  if (metadata?.senderEmail) {
    insertData.sender_email = metadata.senderEmail;
  }
  if (metadata?.subject) {
    insertData.subject = metadata.subject;
  }

  // First, try to INSERT a new record with status='processing'
  const { error: insertError } = await supabase
    .from("processed_emails")
    .insert(insertData);

  // If insert succeeded, we acquired the lock
  if (!insertError) {
    console.log(`Acquired processing lock for: ${emailKey}`);
    return { acquired: true };
  }

  // If we got a duplicate key error (23505), check the existing record's status
  if (insertError.code === "23505") {
    console.log(`Lock already exists for: ${emailKey}, checking status...`);
    
    const { data, error: selectError } = await supabase
      .from("processed_emails")
      .select("status, started_at")
      .eq("s3_key", emailKey)
      .single();

    if (selectError || !data) {
      console.error("Error checking existing lock status:", selectError);
      return { acquired: false, status: "processing", reason: "lock_error" };
    }

    const status = data.status as ProcessingStatus;
    if (status === "processing") {
      const reclaimed = await tryReclaimStaleProcessingLock(supabase, emailKey);
      if (reclaimed) return reclaimed;
    }

    console.log(`Existing lock status: ${status}`);
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
 * Updates the existing record from 'processing' to 'completed'.
 * 
 * @param emailKey - The unique email identifier (Message-Id for Mailgun, S3 key for SES)
 * @param petId - The pet ID associated with the email
 * @param attachmentCount - Number of attachments processed
 * @param success - Whether processing was successful
 * @param options - Optional completion details (documentType, failureReason)
 */
export async function markEmailAsCompleted(
  emailKey: string,
  petId: string,
  attachmentCount: number,
  success: boolean = true,
  options?: CompletionOptions
): Promise<void> {
  const supabase = createSupabaseClient();

  // Build update data
  const updateData: Record<string, unknown> = {
    status: "completed",
    pet_id: petId,
    attachment_count: attachmentCount,
    success,
    completed_at: new Date().toISOString(),
  };

  // Add optional fields
  if (options?.documentType) {
    updateData.document_type = options.documentType;
  }
  if (options?.reviewStatus === "resolved") {
    updateData.failure_reason = null;
  } else if (options?.failureReason) {
    updateData.failure_reason = options.failureReason;
  }
  if (options?.reviewStatus) {
    updateData.review_status = options.reviewStatus;
  }

  const { error } = await supabase
    .from("processed_emails")
    .update(updateData)
    .eq("s3_key", emailKey);

  if (error) {
    console.error("Error marking email as completed:", error);
  } else {
    console.log(`Email marked as completed: ${emailKey} (success: ${success})`);
  }
}

/**
 * Marks email processing as failed.
 * Convenience wrapper around markEmailAsCompleted with success=false.
 * 
 * @param emailKey - The unique email identifier
 * @param petId - The pet ID associated with the email (if known)
 * @param failureReason - Description of why processing failed
 * @param documentType - Type of document being processed (if known)
 */
export async function markEmailAsFailed(
  emailKey: string,
  petId: string | null,
  failureReason: string,
  documentType?: string
): Promise<void> {
  const supabase = createSupabaseClient();

  const updateData: Record<string, unknown> = {
    status: "completed",
    success: false,
    completed_at: new Date().toISOString(),
    failure_reason: failureReason,
    review_status: "pending",
  };

  if (petId) {
    updateData.pet_id = petId;
  }
  if (documentType) {
    updateData.document_type = documentType;
  }

  const { error } = await supabase
    .from("processed_emails")
    .update(updateData)
    .eq("s3_key", emailKey);

  if (error) {
    console.error("Error marking email as failed:", error);
  } else {
    console.log(`Email marked as failed: ${emailKey} - ${failureReason}`);
  }
}

/** Same rules as consumer Review Inbox (`isReviewInboxCandidate`). */
function isReviewInboxRow(row: {
  success?: boolean | null;
  failure_reason?: string | null;
  review_status?: string | null;
}): boolean {
  if (row.review_status === "resolved") {
    return false;
  }
  if (row.review_status === "dismissed") {
    return Boolean(row.failure_reason?.trim()) || row.success === false;
  }
  if (row.success === false) return true;
  return Boolean(row.failure_reason?.trim());
}

/**
 * Re-open a completed Review Inbox row so attachment processing can run again.
 * Includes legacy rows where success=true but failure_reason is still set.
 */
export async function resetFailedRowForReprocess(
  emailKey: string
): Promise<boolean> {
  const supabase = createSupabaseClient();

  const { data: existing, error: selectError } = await supabase
    .from("processed_emails")
    .select("id, success, failure_reason, review_status")
    .eq("s3_key", emailKey)
    .eq("status", "completed")
    .maybeSingle();

  if (selectError) {
    console.error("resetFailedRowForReprocess select error:", selectError);
    return false;
  }
  if (!existing || !isReviewInboxRow(existing)) {
    return false;
  }

  const { data, error } = await supabase
    .from("processed_emails")
    .update({
      status: "processing",
      success: null,
      completed_at: null,
      failure_reason: null,
    })
    .eq("s3_key", emailKey)
    .eq("status", "completed")
    .select("id");

  if (error) {
    console.error("resetFailedRowForReprocess error:", error);
    return false;
  }
  const n = data?.length ?? 0;
  if (n > 0) {
    console.log(`Re-opened Review Inbox row for reprocess: ${emailKey}`);
  }
  return n > 0;
}
