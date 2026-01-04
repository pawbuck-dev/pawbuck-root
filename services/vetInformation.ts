import { Tables, TablesInsert, TablesUpdate } from "@/database.types";
import { supabase } from "@/utils/supabase";

export type VetInformation = Tables<"vet_information">;
export type CareTeamMemberType = "veterinarian" | "dog_walker" | "groomer" | "pet_sitter" | "boarding";

/**
 * Fetch a single vet information record by ID
 */
export const getVetInformation = async (id: string): Promise<VetInformation | null> => {
  const { data, error } = await supabase
    .from("vet_information")
    .select("*")
    .eq("id", id)
    .single();

  if (error) {
    if (error.code === "PGRST116") {
      // No rows returned
      return null;
    }
    throw error;
  }
  return data;
};

/**
 * Create a new vet information record
 */
export const createVetInformation = async (
  vetData: TablesInsert<"vet_information">
): Promise<VetInformation> => {
  const { data, error } = await supabase
    .from("vet_information")
    .insert(vetData)
    .select()
    .single();

  if (error) throw error;
  return data;
};

/**
 * Update an existing vet information record
 */
export const updateVetInformation = async (
  id: string,
  vetData: TablesUpdate<"vet_information">
): Promise<VetInformation> => {
  const { data, error } = await supabase
    .from("vet_information")
    .update(vetData)
    .eq("id", id)
    .select()
    .single();

  if (error) throw error;
  return data;
};

/**
 * Delete a vet information record
 */
export const deleteVetInformation = async (id: string): Promise<void> => {
  const { error } = await supabase
    .from("vet_information")
    .delete()
    .eq("id", id);

  if (error) throw error;
};

/**
 * Fetch all care team members for the current user (across all pets)
 */
export const getAllCareTeamMembers = async (): Promise<VetInformation[]> => {
  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (userError) throw userError;
  if (!user) throw new Error("User not authenticated");

  // First, get all pet IDs for the user
  const { data: userPets, error: petsError } = await supabase
    .from("pets")
    .select("id, vet_information_id")
    .eq("user_id", user.id)
    .is("deleted_at", null);

  if (petsError) throw petsError;

  if (!userPets || userPets.length === 0) {
    return [];
  }

  const petIds = userPets.map((p) => p.id);
  const memberIds = new Set<string>();
  const members: VetInformation[] = [];

  // Get all care team members linked to user's pets via junction table
  if (petIds.length > 0) {
    const { data: linkedMembers, error: linkError } = await supabase
      .from("pet_care_team_members")
      .select(`
        care_team_member_id,
        vet_information:care_team_member_id(*)
      `)
      .in("pet_id", petIds);

    if (linkError) throw linkError;

    // Add members from junction table
    if (linkedMembers) {
      linkedMembers.forEach((link: any) => {
        const member = link.vet_information;
        if (member && !memberIds.has(member.id)) {
          memberIds.add(member.id);
          members.push(member);
        }
      });
    }
  }

  // Also include primary vets from pets table
  const primaryVetIds = userPets
    .map((p) => p.vet_information_id)
    .filter((id): id is string => id !== null && !memberIds.has(id));

  if (primaryVetIds.length > 0) {
    const { data: primaryVets, error: vetsError } = await supabase
      .from("vet_information")
      .select("*")
      .in("id", primaryVetIds);

    if (!vetsError && primaryVets) {
      members.push(...primaryVets);
    }
  }

  return members;
};

/**
 * Check if an email address belongs to a care team member
 * @param email - The email address to check
 * @returns true if the email is in the care team, false otherwise
 */
export const isEmailInCareTeam = async (email: string): Promise<boolean> => {
  const normalizedEmail = email.toLowerCase().trim();
  
  const { data, error } = await supabase
    .from("vet_information")
    .select("id")
    .eq("email", normalizedEmail)
    .single();

  if (error) {
    if (error.code === "PGRST116") {
      // No rows returned - not in care team
      return false;
    }
    throw error;
  }

  return !!data;
};
