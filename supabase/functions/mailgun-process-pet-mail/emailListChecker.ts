import { createClient } from "jsr:@supabase/supabase-js@2";
import type { Pet, S3Config } from "./types.ts";

export type EmailStatus = "whitelisted" | "blocked" | "unknown";
export type CareTeamCheckResult =
  | { isCareTeam: true; name: string }
  | { isCareTeam: false };

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
 * Check if an email belongs to a care team member (vet) associated with the pet
 * This checks both the primary vet (via pets.vet_information_id) and
 * care team members (via pet_care_team_members junction table)
 * @param petId - The pet's ID
 * @param senderEmail - The sender's email address
 * @returns CareTeamCheckResult - whether the email is from a care team member
 */
export async function checkIsCareTeamEmail(
  petId: string,
  senderEmail: string
): Promise<CareTeamCheckResult> {
  const supabase = createSupabaseClient();
  const normalizedEmail = senderEmail.toLowerCase().trim();

  // Second, check if the email matches any care team member linked to the pet
  const { data: careTeamLinks, error: careTeamError } = await supabase
    .from("pet_care_team_members")
    .select(
      `
      care_team_member_id,
      vet_information:care_team_member_id(id, email, vet_name, clinic_name)
    `
    )
    .eq("pet_id", petId);

  if (careTeamError) {
    console.error("Error checking care team members:", careTeamError);
  } else if (careTeamLinks && careTeamLinks.length > 0) {
    for (const link of careTeamLinks) {
      // deno-lint-ignore no-explicit-any
      const vetInfo = link.vet_information as any;
      if (vetInfo && vetInfo.email?.toLowerCase().trim() === normalizedEmail) {
        const name = `${vetInfo.vet_name} (${vetInfo.clinic_name})`;
        console.log(`Email matches care team member: ${name}`);
        return { isCareTeam: true, name };
      }
    }
  }

  console.log(
    `Email ${normalizedEmail} is not from a known care team member for pet ${petId}`
  );
  return { isCareTeam: false };
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
 * Result of saving a pending approval
 */
export interface SavePendingApprovalResult {
  id: string;
  isNew: boolean;
}

/**
 * Save a pending email approval to the database
 * Returns existing approval ID if one already exists for this email (prevents duplicates)
 * @param pet - The pet record
 * @param senderEmail - The sender's email address
 * @param s3Config - The S3 bucket and key for the email
 * @returns Object with approval ID and whether it's a new record
 */
export async function savePendingApproval(
  pet: Pet,
  senderEmail: string,
  s3Config: S3Config
): Promise<SavePendingApprovalResult> {
  const supabase = createSupabaseClient();
  const normalizedEmail = senderEmail.toLowerCase().trim();

  console.log(`Saving pending approval for email from: ${normalizedEmail}`);

  // Check if approval already exists for this S3 key (same email file)
  // This handles duplicate invocations from AWS retries
  const { data: existing } = await supabase
    .from("pending_email_approvals")
    .select("id")
    .eq("s3_key", s3Config.fileKey)
    .maybeSingle();

  if (existing) {
    console.log(
      `Pending approval already exists with ID: ${existing.id} (duplicate request)`
    );
    return { id: existing.id, isNew: false };
  }

  // Create new pending approval
  const { data, error } = await supabase
    .from("pending_email_approvals")
    .insert({
      pet_id: pet.id,
      user_id: pet.user_id,
      sender_email: normalizedEmail,
      s3_bucket: s3Config.bucket,
      s3_key: s3Config.fileKey,
      status: "pending",
    })
    .select("id")
    .single();

  if (error) {
    // Handle race condition - if unique constraint violation, fetch existing record
    if (error.code === "23505") {
      console.log("Race condition detected - fetching existing approval");
      const { data: existingAfterRace } = await supabase
        .from("pending_email_approvals")
        .select("id")
        .eq("s3_key", s3Config.fileKey)
        .single();

      if (existingAfterRace) {
        console.log(
          `Pending approval found after race condition: ${existingAfterRace.id}`
        );
        return { id: existingAfterRace.id, isNew: false };
      }
    }
    console.error("Error saving pending approval:", error);
    throw new Error(`Failed to save pending approval: ${error.message}`);
  }

  console.log(`Pending approval saved with ID: ${data.id}`);
  return { id: data.id, isNew: true };
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
 * Get an existing email entry from the pet's email list
 * @param petId - The pet's ID
 * @param email - The email address to check
 * @returns The existing record or null if not found
 */
async function getEmailEntry(
  petId: string,
  email: string
): Promise<{ id: number; is_blocked: boolean } | null> {
  const supabase = createSupabaseClient();
  const normalizedEmail = email.toLowerCase().trim();

  const { data, error } = await supabase
    .from("pet_email_list")
    .select("id, is_blocked")
    .eq("pet_id", petId)
    .eq("email_id", normalizedEmail)
    .maybeSingle();

  if (error) {
    console.error("Error checking email entry:", error);
    throw new Error(`Failed to check email entry: ${error.message}`);
  }

  return data;
}

/**
 * Update the is_blocked status of an email entry
 * @param id - The email entry ID
 * @param isBlocked - The new blocked status
 */
async function updateEmailBlockStatus(
  id: number,
  isBlocked: boolean
): Promise<void> {
  const supabase = createSupabaseClient();

  const { error } = await supabase
    .from("pet_email_list")
    .update({ is_blocked: isBlocked })
    .eq("id", id);

  if (error) {
    console.error("Error updating email block status:", error);
    throw new Error(`Failed to update email block status: ${error.message}`);
  }
}

/**
 * Add an email to the pet's email list with smart duplicate handling:
 * - If email exists and is blocked, update to unblock it (when whitelisting)
 * - If email exists and is whitelisted, update to block it (when blocking)
 * - If email doesn't exist, insert new record
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

  // Check if email already exists for this pet
  const existing = await getEmailEntry(petId, normalizedEmail);

  if (existing) {
    // If existing is blocked and we're trying to whitelist it, update to unblock
    if (existing.is_blocked && !isBlocked) {
      console.log(
        `Email ${normalizedEmail} was blocked, updating to whitelisted`
      );
      await updateEmailBlockStatus(existing.id, false);
      return;
    }
    // If existing is whitelisted and we're trying to block it, update to block
    if (!existing.is_blocked && isBlocked) {
      console.log(
        `Email ${normalizedEmail} was whitelisted, updating to blocked`
      );
      await updateEmailBlockStatus(existing.id, true);
      return;
    }
    // Already in the desired state, nothing to do
    console.log(
      `Email ${normalizedEmail} already in desired state (blocked: ${isBlocked})`
    );
    return;
  }

  // Insert new record
  const { error } = await supabase.from("pet_email_list").insert({
    pet_id: petId,
    user_id: userId,
    email_id: normalizedEmail,
    is_blocked: isBlocked,
  });

  if (error) {
    // Handle race condition - unique constraint violation
    if (error.code === "23505") {
      console.log(
        `Race condition detected for ${normalizedEmail}, retrying with update`
      );
      const existingAfterRace = await getEmailEntry(petId, normalizedEmail);
      if (existingAfterRace && existingAfterRace.is_blocked !== isBlocked) {
        await updateEmailBlockStatus(existingAfterRace.id, isBlocked);
      }
      return;
    }
    console.error("Error adding to email list:", error);
    throw new Error(`Failed to add to email list: ${error.message}`);
  }

  console.log(`Email ${normalizedEmail} added to list successfully`);
}
