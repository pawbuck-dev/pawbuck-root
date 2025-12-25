import { createClient } from "jsr:@supabase/supabase-js@2";
import type { Pet, S3Config } from "./types.ts";

export type EmailStatus = "whitelisted" | "blocked" | "unknown";

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
 * Check the status of a sender email in the pet_email_list table
 * @param petId - The pet's ID
 * @param senderEmail - The sender's email address
 * @returns EmailStatus - 'whitelisted', 'blocked', or 'unknown'
 */
export async function checkSenderEmailStatus(
  petId: string,
  senderEmail: string
): Promise<EmailStatus> {
  const supabase = createSupabaseClient();
  const normalizedEmail = senderEmail.toLowerCase().trim();

  console.log(`Checking email status for: ${normalizedEmail} (pet: ${petId})`);

  const { data, error } = await supabase
    .from("pet_email_list")
    .select("id, is_blocked")
    .eq("pet_id", petId)
    .eq("email_id", normalizedEmail)
    .maybeSingle();

  if (error) {
    console.error("Error checking email status:", error);
    throw new Error(`Database error: ${error.message}`);
  }

  if (!data) {
    console.log(`Email ${normalizedEmail} not found in list - status: unknown`);
    return "unknown";
  }

  const status = data.is_blocked ? "blocked" : "whitelisted";
  console.log(`Email ${normalizedEmail} found - status: ${status}`);
  return status;
}

/**
 * Save a pending email approval to the database
 * @param pet - The pet record
 * @param senderEmail - The sender's email address
 * @param s3Config - The S3 bucket and key for the email
 * @returns The ID of the created pending approval record
 */
export async function savePendingApproval(
  pet: Pet,
  senderEmail: string,
  s3Config: S3Config
): Promise<string> {
  const supabase = createSupabaseClient();

  console.log(`Saving pending approval for email from: ${senderEmail}`);

  const { data, error } = await supabase
    .from("pending_email_approvals")
    .insert({
      pet_id: pet.id,
      user_id: pet.user_id,
      sender_email: senderEmail.toLowerCase().trim(),
      s3_bucket: s3Config.bucket,
      s3_key: s3Config.fileKey,
      status: "pending",
    })
    .select("id")
    .single();

  if (error) {
    console.error("Error saving pending approval:", error);
    throw new Error(`Failed to save pending approval: ${error.message}`);
  }

  console.log(`Pending approval saved with ID: ${data.id}`);
  return data.id;
}

/**
 * Update the status of a pending email approval
 * @param approvalId - The ID of the pending approval
 * @param status - The new status ('approved' or 'rejected')
 */
export async function updatePendingApprovalStatus(
  approvalId: string,
  status: "approved" | "rejected"
): Promise<void> {
  const supabase = createSupabaseClient();

  const { error } = await supabase
    .from("pending_email_approvals")
    .update({ status })
    .eq("id", approvalId);

  if (error) {
    console.error("Error updating pending approval status:", error);
    throw new Error(`Failed to update approval status: ${error.message}`);
  }

  console.log(`Pending approval ${approvalId} updated to: ${status}`);
}

/**
 * Get a pending approval by ID
 * @param approvalId - The ID of the pending approval
 * @returns The pending approval record or null
 */
export async function getPendingApproval(approvalId: string): Promise<{
  id: string;
  pet_id: string;
  user_id: string;
  sender_email: string;
  s3_bucket: string;
  s3_key: string;
  status: string;
} | null> {
  const supabase = createSupabaseClient();

  const { data, error } = await supabase
    .from("pending_email_approvals")
    .select("*")
    .eq("id", approvalId)
    .single();

  if (error) {
    if (error.code === "PGRST116") {
      return null;
    }
    console.error("Error fetching pending approval:", error);
    throw new Error(`Failed to fetch pending approval: ${error.message}`);
  }

  return data;
}

/**
 * Add an email to the pet's email list (whitelist or blocklist)
 * @param petId - The pet's ID
 * @param userId - The user's ID
 * @param email - The email address to add
 * @param isBlocked - Whether to add as blocked (true) or whitelisted (false)
 */
export async function addToEmailList(
  petId: string,
  userId: string,
  email: string,
  isBlocked: boolean = false
): Promise<void> {
  const supabase = createSupabaseClient();
  const normalizedEmail = email.toLowerCase().trim();

  console.log(
    `Adding ${normalizedEmail} to email list (blocked: ${isBlocked})`
  );

  const { error } = await supabase.from("pet_email_list").insert({
    pet_id: petId,
    user_id: userId,
    email_id: normalizedEmail,
    is_blocked: isBlocked,
  });

  if (error) {
    console.error("Error adding to email list:", error);
    throw new Error(`Failed to add to email list: ${error.message}`);
  }

  console.log(`Email ${normalizedEmail} added to list successfully`);
}

