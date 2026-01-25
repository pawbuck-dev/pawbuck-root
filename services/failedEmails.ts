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
  // #region agent log
  fetch('http://127.0.0.1:7242/ingest/6159b4ab-31b3-4ac9-9974-35393e1704ad',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'failedEmails.ts:177',message:'getFailedEmailAttachments entry',data:{s3Key},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
  // #endregion
  try {
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/6159b4ab-31b3-4ac9-9974-35393e1704ad',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'failedEmails.ts:181',message:'Before supabase.functions.invoke',data:{functionName:'get-failed-email-attachment',s3Key},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
    // #endregion
    const { data, error } = await supabase.functions.invoke("get-failed-email-attachment", {
      body: { s3_key: s3Key },
    });

    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/6159b4ab-31b3-4ac9-9974-35393e1704ad',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'failedEmails.ts:186',message:'After supabase.functions.invoke',data:{hasError:!!error,errorType:error?.constructor?.name,errorStatus:error?.status,errorMessage:error?.message,hasData:!!data,dataKeys:data?Object.keys(data):null},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'B'})}).catch(()=>{});
    // #endregion

    if (error) {
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/6159b4ab-31b3-4ac9-9974-35393e1704ad',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'failedEmails.ts:195',message:'Error from function invoke',data:{errorName:error?.constructor?.name,errorStatus:error?.status,errorMessage:error?.message,errorContext:error?.context},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'C'})}).catch(()=>{});
      // #endregion
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
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/6159b4ab-31b3-4ac9-9974-35393e1704ad',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'failedEmails.ts:210',message:'Function returned error in response body',data:{errorCode:data?.code,errorMessage:data?.error},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'B'})}).catch(()=>{});
      // #endregion
      console.error("Function returned error:", data.error);
      if (data.code === "ATTACHMENT_NOT_STORED" || data.code === "NO_ATTACHMENTS") {
        // This is expected - attachment not stored (likely from known sender) or no attachments
        console.log(`Attachment not available: ${data.code}`);
        return null;
      }
      return null;
    }

    if (data?.attachments) {
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/6159b4ab-31b3-4ac9-9974-35393e1704ad',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'failedEmails.ts:205',message:'Successfully retrieved attachments',data:{attachmentCount:data.attachments.length},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
      // #endregion
      console.log(`Found ${data.attachments.length} attachment(s) for email ${s3Key}`);
      return data.attachments;
    }

    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/6159b4ab-31b3-4ac9-9974-35393e1704ad',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'failedEmails.ts:211',message:'No attachments in response',data:{hasData:!!data,dataKeys:data?Object.keys(data):null},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'D'})}).catch(()=>{});
    // #endregion
    return null;
  } catch (err) {
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/6159b4ab-31b3-4ac9-9974-35393e1704ad',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'failedEmails.ts:214',message:'Exception in getFailedEmailAttachments',data:{errorType:err?.constructor?.name,errorMessage:err instanceof Error?err.message:String(err),errorStack:err instanceof Error?err.stack:null},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'E'})}).catch(()=>{});
    // #endregion
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

    // Check if we got a signed URL directly (preferred) or just a path
    if (data?.signedUrl) {
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/6159b4ab-31b3-4ac9-9974-35393e1704ad',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'failedEmails.ts:263',message:'Retrieved signed URL directly',data:{hasSignedUrl:true,filename:data.filename,mimeType:data.mimeType},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
      // #endregion
      console.log(`Retrieved signed URL for index ${attachmentIndex}`);
      // Return the signed URL - the client can use it directly
      return data.signedUrl;
    }

    if (data?.attachmentPath) {
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/6159b4ab-31b3-4ac9-9974-35393e1704ad',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'failedEmails.ts:271',message:'Retrieved attachment path (fallback)',data:{attachmentPath:data.attachmentPath,filename:data.filename,mimeType:data.mimeType},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
      // #endregion
      console.log(`Retrieved attachment path for index ${attachmentIndex}: ${data.attachmentPath}`);
      return data.attachmentPath;
    }

    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/6159b4ab-31b3-4ac9-9974-35393e1704ad',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'failedEmails.ts:271',message:'No attachmentPath in response',data:{hasData:!!data,dataKeys:data?Object.keys(data):null},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'D'})}).catch(()=>{});
    // #endregion
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
