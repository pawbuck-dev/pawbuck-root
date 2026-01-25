import { supabase } from "@/utils/supabase";

/**
 * Represents a failed email record with pet information
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
  pets?: {
    name: string;
    breed: string | null;
  } | null;
}

/**
 * Fetch all failed emails for the current user's pets
 * Returns emails where success = false and status = 'completed'
 */
export const getFailedEmails = async (): Promise<FailedEmail[]> => {
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

  // Fetch failed emails for these pets
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
      pets (
        name,
        breed
      )
    `
    )
    .in("pet_id", petIds)
    .eq("status", "completed")
    .eq("success", false)
    .order("completed_at", { ascending: false });

  if (error) {
    console.error("Error fetching failed emails:", error);
    throw error;
  }

  const petNames = pets.map((p) => p.name);
  console.log("Failed emails:", data, petNames);

  return (data as FailedEmail[]) ?? [];
};

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
      pets (
        name,
        breed
      )
    `
    )
    .eq("id", id)
    .eq("success", false)
    .single();

  if (error) {
    if (error.code === "PGRST116") {
      return null;
    }
    console.error("Error fetching failed email:", error);
    throw error;
  }

  return data as FailedEmail;
};

/**
 * Get count of failed emails for the current user
 */
export const getFailedEmailsCount = async (): Promise<number> => {
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) {
    return 0;
  }

  // Get pet IDs for this user
  const { data: pets, error: petsError } = await supabase
    .from("pets")
    .select("id")
    .eq("user_id", userData.user.id);

  if (petsError || !pets || pets.length === 0) {
    return 0;
  }

  const petIds = pets.map((p) => p.id);

  const { count, error } = await supabase
    .from("processed_emails")
    .select("*", { count: "exact", head: true })
    .in("pet_id", petIds)
    .eq("status", "completed")
    .eq("success", false);

  if (error) {
    console.error("Error counting failed emails:", error);
    return 0;
  }

  return count ?? 0;
};

/**
 * Delete/dismiss a failed email record
 * This removes it from the list so users don't see old failures
 */
export const dismissFailedEmail = async (id: string): Promise<void> => {
  const { error } = await supabase
    .from("processed_emails")
    .delete()
    .eq("id", id)
    .eq("success", false);

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
      if (error && typeof error === 'object') {
        try {
          console.error("Error details:", JSON.stringify(error, null, 2));
        } catch (e) {
          console.error("Error message:", error.message || String(error));
        }
      }
      return null;
    }

    if (data?.error) {
      console.error("Function returned error:", data.error);
      if (data.code === "ATTACHMENT_NOT_STORED") {
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
      if (error && typeof error === 'object') {
        try {
          console.error("Error details:", JSON.stringify(error, null, 2));
        } catch (e) {
          console.error("Error message:", error.message || String(error));
        }
      }
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
