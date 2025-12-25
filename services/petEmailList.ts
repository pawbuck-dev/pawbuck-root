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
 * Add a new email to the list
 */
export const addEmail = async (
  petId: string,
  email: string,
  isBlocked: boolean = false
): Promise<PetEmailList> => {
  const insertData: TablesInsert<"pet_email_list"> = {
    pet_id: petId,
    email_id: email.toLowerCase().trim(),
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

