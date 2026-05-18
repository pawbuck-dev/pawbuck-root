import { supabase } from "@/utils/supabase";

/**
 * Review Inbox item (unmatchable or failed automatic processing; same row as `processed_emails`).
 * @deprecated Prefer {@link ReviewInboxItem} naming in new code
 */
export interface FailedEmail {
  id: string;
  s3_key: string;
  pet_id: string | null;
  sender_email: string | null;
  subject: string | null;
  document_type: string | null;
  failure_reason: string | null;
  completed_at: string | null;
  started_at: string | null;
  review_status: "pending" | "resolved" | "dismissed" | null;
  pets?: {
    name: string;
    breed: string | null;
  } | null;
}

export type ReviewInboxItem = FailedEmail;

/** Rows that need owner attention in Messages / Review Inbox. */
export function isReviewInboxCandidate(row: {
  success: boolean | null;
  failure_reason: string | null;
  review_status: string | null;
}): boolean {
  if (row.review_status === "dismissed" || row.review_status === "resolved") {
    return false;
  }
  if (row.success === false) return true;
  return Boolean(row.failure_reason?.trim());
}

/**
 * Fetch all Review Inbox items for the current user's pets (failed processing, not dismissed).
 */
export const getReviewInbox = async (): Promise<ReviewInboxItem[]> => {
  // First get the user's pets
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) {
    return [];
  }

  // Get pet IDs for this user
  const { data: pets, error: petsError } = await supabase
    .from("pets")
    .select("id, name")
    .eq("user_id", userData.user.id);

  if (petsError || !pets || pets.length === 0) {
    return [];
  }

  const petIds = pets.map((p) => p.id);

  // Fetch review inbox for these pets
  const { data, error } = await supabase
    .from("processed_emails")
    .select(
      `
      id,
      s3_key,
      pet_id,
      sender_email,
      subject,
      document_type,
      failure_reason,
      completed_at,
      started_at,
      review_status,
      success,
      pets (
        name,
        breed
      )
    `
    )
    .in("pet_id", petIds)
    .eq("status", "completed")
    .or("success.eq.false,failure_reason.not.is.null")
    .order("completed_at", { ascending: false });

  if (error) {
    console.error("Error fetching review inbox:", error);
    throw error;
  }

  const rows = (data as ReviewInboxItem[]) ?? [];
  return rows.filter(isReviewInboxCandidate);
};

/**
 * Attachment processing issues for a message thread (same sender + pet, pending review).
 */
export const getThreadProcessingFailures = async (
  petId: string,
  senderEmail: string,
  subject?: string
): Promise<ReviewInboxItem[]> => {
  const normalizedSender = senderEmail.toLowerCase().trim();
  const { data, error } = await supabase
    .from("processed_emails")
    .select(
      `
      id,
      s3_key,
      pet_id,
      sender_email,
      subject,
      document_type,
      failure_reason,
      completed_at,
      started_at,
      review_status,
      success,
      pets (
        name,
        breed
      )
    `
    )
    .eq("pet_id", petId)
    .eq("status", "completed")
    .eq("sender_email", normalizedSender)
    .not("failure_reason", "is", null)
    .order("completed_at", { ascending: false })
    .limit(10);

  if (error) {
    console.error("Error fetching thread processing failures:", error);
    return [];
  }

  let rows = ((data ?? []) as ReviewInboxItem[]).filter(isReviewInboxCandidate);
  if (subject?.trim()) {
    const normalizedSubject = subject.trim().toLowerCase();
    const subjectMatches = rows.filter(
      (r) => (r.subject ?? "").trim().toLowerCase() === normalizedSubject
    );
    if (subjectMatches.length > 0) {
      rows = subjectMatches;
    }
  }
  return rows;
};

/** User-facing summary from processed_emails.failure_reason. */
export function summarizeAttachmentFailureReason(failureReason: string): string {
  const docMatch = failureReason.match(/Document '[^']+':\s*(.+)$/i);
  if (docMatch?.[1]) return docMatch[1].trim();
  const failedPrefix = /^Failed to process \d+ document\(s\):\s*/i;
  return failureReason.replace(failedPrefix, "").trim() || failureReason;
}

/** @deprecated use {@link getReviewInbox} */
export const getFailedEmails = getReviewInbox;

/**
 * Get a single failed email by ID
 */
export const getFailedEmailById = async (
  id: string
): Promise<FailedEmail | null> => {
  const { data, error } = await supabase
    .from("processed_emails")
    .select(
      `
      id,
      s3_key,
      pet_id,
      sender_email,
      subject,
      document_type,
      failure_reason,
      completed_at,
      started_at,
      review_status,
      success,
      pets (
        name,
        breed
      )
    `
    )
    .eq("id", id)
    .single();

  if (error) {
    if (error.code === "PGRST116") {
      return null;
    }
    console.error("Error fetching failed email:", error);
    throw error;
  }

  const row = data as FailedEmail & { success?: boolean | null };
  if (!isReviewInboxCandidate(row)) {
    return null;
  }
  return row;
};

/**
 * Get count of failed emails for the current user
 */
export const getFailedEmailsCount = async (): Promise<number> => {
  const items = await getReviewInbox();
  return items.length;
};

/**
 * Delete/dismiss a failed email record
 * This removes it from the list so users don't see old failures
 */
export const dismissFailedEmail = async (id: string): Promise<void> => {
  const { error } = await supabase
    .from("processed_emails")
    .update({
      review_status: "dismissed",
      success: false,
    })
    .eq("id", id);

  if (error) {
    console.error("Error dismissing failed email:", error);
    throw error;
  }
};

/**
 * Get list of all attachments from stored email for failed email
 */
export const getFailedEmailAttachments = async (
  s3Key: string
): Promise<Array<{ index: number; filename: string; mimeType: string; size: number }> | null> => {
  try {
    const { data, error } = await supabase.functions.invoke("get-failed-email-attachment", {
      body: { s3_key: s3Key },
    });

    if (error) {
      console.error("Error getting failed email attachments:", error);
      // Safely extract error information without stringifying the entire object
      const errorInfo = {
        name: error.name || 'Unknown',
        message: error.message || String(error),
        ...(error.context && { context: error.context }),
      };
      console.error("Error details:", errorInfo);
      return null;
    }

    if (data?.error) {
      console.error("Function returned error:", data.error);
      if (data.code === "ATTACHMENT_NOT_STORED" || data.code === "NO_ATTACHMENTS") {
        // This is expected - attachment not stored (likely from known sender) or no attachments
        console.log(`Attachment not available: ${data.code}`);
        return null;
      }
      return null;
    }

    if (data?.attachments) {
      console.log(`Found ${data.attachments.length} attachment(s) for email ${s3Key}`);
      return data.attachments;
    }

    return null;
  } catch (err) {
    console.error("Error calling get-failed-email-attachment function:", err);
    if (err instanceof Error) {
      console.error("Error message:", err.message);
      console.error("Error stack:", err.stack);
    }
    return null;
  }
};

/**
 * Get attachment path from stored email for failed email
 * @param s3Key - The email identifier
 * @param attachmentIndex - Index of the attachment to retrieve (0-based)
 */
export const getFailedEmailAttachmentPath = async (
  s3Key: string,
  attachmentIndex: number = 0
): Promise<string | null> => {
  try {
    // The s3_key is the messageId, we need to retrieve the stored email JSON
    // and extract the specified attachment, then upload it temporarily for viewing
    const { data, error } = await supabase.functions.invoke("get-failed-email-attachment", {
      body: { s3_key: s3Key, attachment_index: attachmentIndex },
    });

    if (error) {
      console.error("Error getting failed email attachment:", error);
      // Safely extract error information without stringifying the entire object
      const errorInfo = {
        name: error.name || 'Unknown',
        message: error.message || String(error),
        ...(error.context && { context: error.context }),
      };
      console.error("Error details:", errorInfo);
      // Check if it's a 404 (attachment not stored) vs other errors
      if (error.message?.includes("404") || error.message?.includes("not found")) {
        // This is expected for known senders - don't log as error
        console.log("Attachment not available in stored email data");
      }
      return null;
    }

    // Check if the response indicates attachment is not available
    if (data?.error) {
      console.error("Function returned error:", data.error);
      if (data.code === "ATTACHMENT_NOT_STORED") {
        console.log("Attachment not stored (likely from known sender)");
      }
      return null;
    }

    // Check if we got a signed URL directly (preferred) or just a path
    if (data?.signedUrl) {
      console.log(`Retrieved signed URL for index ${attachmentIndex}`);
      // Return the signed URL - the client can use it directly
      return data.signedUrl;
    }

    if (data?.attachmentPath) {
      console.log(`Retrieved attachment path for index ${attachmentIndex}: ${data.attachmentPath}`);
      return data.attachmentPath;
    }

    return null;
  } catch (err) {
    console.error("Error calling get-failed-email-attachment function:", err);
    if (err instanceof Error) {
      console.error("Error message:", err.message);
      console.error("Error stack:", err.stack);
    }
    return null;
  }
};
