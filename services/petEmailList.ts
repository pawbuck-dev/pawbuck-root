import { Tables, TablesInsert } from "@/database.types";
import { supabase } from "@/utils/supabase";

export type PetEmailList = Tables<"pet_email_list">;

// Unified type for whitelisted contacts (from care team or pet_email_list)
export type WhitelistedContact = {
  email_id: string;
  source: "care_team" | "manual";
  name?: string; // Available for care team members
  type?: string; // Care team member type (veterinarian, groomer, etc.)
  created_at?: string;
};

/**
 * Fetch all whitelisted contacts for a pet
 * Combines:
 * 1. Care team members (from pet_care_team_members + vet_information)
 * 2. Additional whitelisted emails (from pet_email_list where is_blocked = false)
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
 * Fetch all whitelisted contacts including care team members
 * Returns a unified list with source information
 * Includes:
 * 1. Primary vet (via pets.vet_information_id)
 * 2. Care team members (via pet_care_team_members junction table)
 * 3. Additional whitelisted emails (from pet_email_list)
 */
export const getAllWhitelistedContacts = async (petId: string): Promise<WhitelistedContact[]> => {
  const contacts: WhitelistedContact[] = [];
  const seenEmails = new Set<string>();

  // 1. Fetch primary vet for this pet
  const { data: petData, error: petError } = await supabase
    .from("pets")
    .select(`
      vet_information_id,
      vet_information:vet_information_id(email, vet_name, type, created_at)
    `)
    .eq("id", petId)
    .single();

  if (petError && petError.code !== "PGRST116") throw petError;

  // Add primary vet to contacts
  if (petData?.vet_information) {
    const primaryVet = petData.vet_information as any;
    if (primaryVet?.email) {
      const normalizedEmail = primaryVet.email.toLowerCase().trim();
      if (!seenEmails.has(normalizedEmail)) {
        seenEmails.add(normalizedEmail);
        contacts.push({
          email_id: normalizedEmail,
          source: "care_team",
          name: primaryVet.vet_name || undefined,
          type: primaryVet.type || "veterinarian",
          created_at: primaryVet.created_at,
        });
      }
    }
  }

  // 2. Fetch care team members for this pet (via junction table)
  const { data: careTeamLinks, error: careTeamError } = await supabase
    .from("pet_care_team_members")
    .select(`
      care_team_member_id,
      created_at,
      vet_information:care_team_member_id(email, vet_name, type)
    `)
    .eq("pet_id", petId);

  if (careTeamError) throw careTeamError;

  // Add care team members to contacts
  if (careTeamLinks) {
    careTeamLinks.forEach((link: any) => {
      const member = link.vet_information;
      if (member?.email) {
        const normalizedEmail = member.email.toLowerCase().trim();
        if (!seenEmails.has(normalizedEmail)) {
          seenEmails.add(normalizedEmail);
          contacts.push({
            email_id: normalizedEmail,
            source: "care_team",
            name: member.vet_name || undefined,
            type: member.type || undefined,
            created_at: link.created_at,
          });
        }
      }
    });
  }

  // 3. Fetch additional whitelisted emails from pet_email_list
  const { data: emailListData, error: emailListError } = await supabase
    .from("pet_email_list")
    .select("*")
    .eq("pet_id", petId)
    .eq("is_blocked", false)
    .order("created_at", { ascending: false });

  if (emailListError) throw emailListError;

  // Add manual whitelist entries (excluding those already in care team)
  if (emailListData) {
    emailListData.forEach((entry) => {
      const normalizedEmail = entry.email_id.toLowerCase().trim();
      if (!seenEmails.has(normalizedEmail)) {
        seenEmails.add(normalizedEmail);
        contacts.push({
          email_id: normalizedEmail,
          source: "manual",
          created_at: entry.created_at,
        });
      }
    });
  }

  return contacts;
};

/**
 * Check if an email is whitelisted for a pet
 * Checks in order:
 * 1. Primary vet (via pets.vet_information_id)
 * 2. Care team members (via pet_care_team_members)
 * 3. Manual whitelist (via pet_email_list)
 */
export const isEmailWhitelisted = async (petId: string, email: string): Promise<boolean> => {
  const normalizedEmail = email.toLowerCase().trim();

  // 1. Check primary vet first
  const { data: petData, error: petError } = await supabase
    .from("pets")
    .select(`
      vet_information_id,
      vet_information:vet_information_id(email)
    `)
    .eq("id", petId)
    .single();

  if (petError && petError.code !== "PGRST116") throw petError;

  if (petData?.vet_information) {
    const primaryVetEmail = (petData.vet_information as any)?.email?.toLowerCase()?.trim();
    if (primaryVetEmail === normalizedEmail) return true;
  }

  // 2. Check care team members via junction table
  const { data: careTeamLinks, error: careTeamError } = await supabase
    .from("pet_care_team_members")
    .select(`
      care_team_member_id,
      vet_information:care_team_member_id(email)
    `)
    .eq("pet_id", petId);

  if (careTeamError) throw careTeamError;

  const inCareTeam = careTeamLinks?.some((link: any) => {
    const memberEmail = link.vet_information?.email?.toLowerCase()?.trim();
    return memberEmail === normalizedEmail;
  });

  if (inCareTeam) return true;

  // 3. Check pet_email_list (manual whitelist)
  const { data: emailEntry, error: emailError } = await supabase
    .from("pet_email_list")
    .select("is_blocked")
    .eq("pet_id", petId)
    .eq("email_id", normalizedEmail)
    .maybeSingle();

  if (emailError) throw emailError;

  return emailEntry ? !emailEntry.is_blocked : false;
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

