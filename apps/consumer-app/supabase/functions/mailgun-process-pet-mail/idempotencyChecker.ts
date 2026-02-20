import { createClient } from "jsr:@supabase/supabase-js@2";

export type ProcessingStatus = "processing" | "completed";

export interface LockResult {
  acquired: boolean;
  status?: ProcessingStatus;
}

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
      .select("status")
      .eq("s3_key", emailKey)
      .single();

    if (selectError || !data) {
      console.error("Error checking existing lock status:", selectError);
      // Fail safe - don't process if we can't determine status
      return { acquired: false, status: "processing" };
    }

    console.log(`Existing lock status: ${data.status}`);
    return { acquired: false, status: data.status as ProcessingStatus };
  }

  // For other errors, log and fail open (allow processing)
  console.error("Error acquiring processing lock:", insertError);
  return { acquired: true }; // Fail open - allow processing on unexpected errors
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
  if (options?.failureReason) {
    updateData.failure_reason = options.failureReason;
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
