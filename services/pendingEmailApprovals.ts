import { Tables } from "@/database.types";
import { supabase } from "@/utils/supabase";
import { addEmail } from "./petEmailList";

export type PendingEmailApproval = Tables<"pending_email_approvals">;

export interface PendingApprovalWithPet extends PendingEmailApproval {
  pets: {
    name: string;
  } | null;
}

/**
 * Fetch all pending email approvals for the current user
 */
export const getPendingApprovals = async (): Promise<
  PendingApprovalWithPet[]
> => {
  const { data, error } = await supabase
    .from("pending_email_approvals")
    .select(
      `
      *,
      pets (
        name
      )
    `
    )
    .eq("status", "pending")
    .order("created_at", { ascending: true });

  if (error) throw error;
  return (data as PendingApprovalWithPet[]) ?? [];
};

/**
 * Update the status of a pending email approval
 */
export const updateApprovalStatus = async (
  approvalId: string,
  status: "approved" | "rejected"
): Promise<void> => {
  const { error } = await supabase
    .from("pending_email_approvals")
    .update({ status })
    .eq("id", approvalId);

  if (error) throw error;
};

/**
 * Approve an email - whitelist sender and re-process the email
 * @param approvalId - The pending approval ID
 * @param petId - The pet ID
 * @param senderEmail - The sender's email address
 * @param s3Bucket - S3 bucket containing the email
 * @param s3Key - S3 key for the email file
 */
export const approveEmail = async (
  approvalId: string,
  petId: string,
  senderEmail: string,
  s3Bucket: string,
  s3Key: string
): Promise<{ success: boolean; error?: string }> => {
  try {
    // Step 1: Update approval status to 'approved'
    await updateApprovalStatus(approvalId, "approved");

    // Step 2: Add sender to whitelist (is_blocked = false)
    await addEmail(petId, senderEmail, false);

    // Step 3: Re-invoke the process-pet-mail function
    const { data, error } = await supabase.functions.invoke(
      "mailgun-process-pet-mail",
      {
        body: {
          bucket: s3Bucket,
          fileKey: s3Key,
        },
      }
    );

    if (error) {
      console.error("Error re-processing email:", error);
      return { success: false, error: error.message };
    }

    console.log("Email re-processing result:", data);
    return { success: true };
  } catch (error) {
    console.error("Error approving email:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
};

/**
 * Reject an email - add sender to blocklist
 * @param approvalId - The pending approval ID
 * @param petId - The pet ID
 * @param senderEmail - The sender's email address
 */
export const rejectEmail = async (
  approvalId: string,
  petId: string,
  senderEmail: string
): Promise<{ success: boolean; error?: string }> => {
  try {
    // Step 1: Update approval status to 'rejected'
    await updateApprovalStatus(approvalId, "rejected");

    // Step 2: Add sender to blocklist (is_blocked = true)
    await addEmail(petId, senderEmail, true);

    return { success: true };
  } catch (error) {
    console.error("Error rejecting email:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
};

/**
 * Delete a pending approval (cleanup)
 */
export const deletePendingApproval = async (
  approvalId: string
): Promise<void> => {
  const { error } = await supabase
    .from("pending_email_approvals")
    .delete()
    .eq("id", approvalId);

  if (error) throw error;
};
