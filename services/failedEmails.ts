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
        name
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
        name
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
