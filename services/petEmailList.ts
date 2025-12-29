import { Tables, TablesInsert } from "@/database.types";
import { supabase } from "@/utils/supabase";

export type PetEmailList = Tables<"pet_email_list">;

/**
 * Fetch whitelisted emails for a pet (is_blocked = false)
 */
export const getWhitelistedEmails = async (petId: string): Promise<PetEmailList[]> => {
  const { data, error } = await supabase
    .from("pet_email_list")
    .select("*")
    .eq("pet_id", petId)
    .eq("is_blocked", false)
    .order("created_at", { ascending: false });

  if (error) throw error;
  return data ?? [];
};

/**
 * Fetch blocked emails for a pet (is_blocked = true)
 */
export const getBlockedEmails = async (petId: string): Promise<PetEmailList[]> => {
  const { data, error } = await supabase
    .from("pet_email_list")
    .select("*")
    .eq("pet_id", petId)
    .eq("is_blocked", true)
    .order("created_at", { ascending: false });

  if (error) throw error;
  return data ?? [];
};

/**
 * Fetch all emails for a pet (both whitelisted and blocked)
 */
export const getAllEmails = async (petId: string): Promise<PetEmailList[]> => {
  const { data, error } = await supabase
    .from("pet_email_list")
    .select("*")
    .eq("pet_id", petId)
    .order("created_at", { ascending: false });

  if (error) throw error;
  return data ?? [];
};

/**
 * Check if an email already exists for a pet
 * @returns The existing record or null if not found
 */
export const getEmailByPetAndAddress = async (
  petId: string,
  email: string
): Promise<PetEmailList | null> => {
  const normalizedEmail = email.toLowerCase().trim();

  const { data, error } = await supabase
    .from("pet_email_list")
    .select("*")
    .eq("pet_id", petId)
    .eq("email_id", normalizedEmail)
    .maybeSingle();

  if (error) throw error;
  return data;
};

/**
 * Update the is_blocked status of an email entry
 */
export const updateEmailBlockStatus = async (
  id: number,
  isBlocked: boolean
): Promise<PetEmailList> => {
  const { data, error } = await supabase
    .from("pet_email_list")
    .update({ is_blocked: isBlocked })
    .eq("id", id)
    .select()
    .single();

  if (error) throw error;
  return data;
};

/**
 * Add an email to the list with smart duplicate handling:
 * - If email exists and is blocked, update to unblock it
 * - If email exists and is already whitelisted, throw duplicate error
 * - If email doesn't exist, insert new record
 */
export const addEmail = async (
  petId: string,
  email: string,
  isBlocked: boolean = false
): Promise<PetEmailList> => {
  const normalizedEmail = email.toLowerCase().trim();

  // Check if email already exists for this pet
  const existing = await getEmailByPetAndAddress(petId, normalizedEmail);

  if (existing) {
    // If existing is blocked and we're trying to whitelist it, update to unblock
    if (existing.is_blocked && !isBlocked) {
      return await updateEmailBlockStatus(existing.id, false);
    }
    // If existing is whitelisted and we're trying to whitelist again, throw error
    if (!existing.is_blocked && !isBlocked) {
      throw new Error("This email is already in your safe senders list");
    }
    // If existing is whitelisted and we're trying to block it, update to block
    if (!existing.is_blocked && isBlocked) {
      return await updateEmailBlockStatus(existing.id, true);
    }
    // If existing is blocked and we're trying to block again, just return existing
    return existing;
  }

  // Insert new record
  const insertData: TablesInsert<"pet_email_list"> = {
    pet_id: petId,
    email_id: normalizedEmail,
    is_blocked: isBlocked,
  };

  const { data, error } = await supabase
    .from("pet_email_list")
    .insert(insertData)
    .select()
    .single();

  if (error) throw error;
  return data;
};

/**
 * Update an existing email entry
 */
export const updateEmail = async (
  id: number,
  email: string
): Promise<PetEmailList> => {
  const { data, error } = await supabase
    .from("pet_email_list")
    .update({ email_id: email.toLowerCase().trim() })
    .eq("id", id)
    .select()
    .single();

  if (error) throw error;
  return data;
};

/**
 * Delete an email entry
 */
export const deleteEmail = async (id: number): Promise<void> => {
  const { error } = await supabase
    .from("pet_email_list")
    .delete()
    .eq("id", id);

  if (error) throw error;
};

