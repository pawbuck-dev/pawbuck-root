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

  // Get all care team members linked to user's pets
  const { data, error } = await supabase
    .from("pet_care_team_members")
    .select(`
      vet_information!inner(*)
    `)
    .in("pet_id", 
      supabase
        .from("pets")
        .select("id")
        .eq("user_id", user.id)
        .is("deleted_at", null)
    );

  if (error) throw error;

  // Also include primary vets from pets table
  const { data: pets, error: petsError } = await supabase
    .from("pets")
    .select("vet_information_id")
    .eq("user_id", user.id)
    .is("deleted_at", null)
    .not("vet_information_id", "is", null);

  if (petsError) throw petsError;

  const memberIds = new Set<string>();
  const members: VetInformation[] = [];

  // Add members from junction table
  if (data) {
    data.forEach((item: any) => {
      const member = item.vet_information;
      if (member && !memberIds.has(member.id)) {
        memberIds.add(member.id);
        members.push(member);
      }
    });
  }

  // Add primary vets
  if (pets) {
    const primaryVetIds = pets
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
  }

  return members;
};
