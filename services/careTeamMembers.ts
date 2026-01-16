import { Tables, TablesInsert, TablesUpdate } from "@/database.types";
import { supabase } from "@/utils/supabase";

export type CareTeamMemberType = "veterinarian" | "dog_walker" | "groomer" | "pet_sitter" | "boarding";

export type CareTeamMember = Tables<"vet_information"> & {
  type: CareTeamMemberType;
};

export type PetCareTeamMember = Tables<"pet_care_team_members"> & {
  care_team_member: CareTeamMember;
};

/**
 * Fetch all care team members for a pet (via junction table)
 */
export const getCareTeamMembersForPet = async (petId: string): Promise<CareTeamMember[]> => {
  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (userError) throw userError;
  if (!user) throw new Error("User not authenticated");

  // Get care team members linked via junction table
  const { data: linkedMembers, error: linkError } = await supabase
    .from("pet_care_team_members")
    .select(`
      care_team_member_id,
      vet_information:care_team_member_id(*)
    `)
    .eq("pet_id", petId);

  if (linkError) throw linkError;

  const members: CareTeamMember[] = [];

  // Add linked members from junction table
  if (linkedMembers) {
    linkedMembers.forEach((link: any) => {
      const member = link.vet_information;
      if (member) {
        members.push(member as CareTeamMember);
      }
    });
  }

  return members;
};

/**
 * Link a care team member to a pet
 */
export const linkCareTeamMemberToPet = async (
  petId: string,
  careTeamMemberId: string
): Promise<void> => {
  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (userError) throw userError;
  if (!user) throw new Error("User not authenticated");

  // Verify pet belongs to user
  const { data: pet, error: petError } = await supabase
    .from("pets")
    .select("id")
    .eq("id", petId)
    .eq("user_id", user.id)
    .single();

  if (petError || !pet) {
    throw new Error("Pet not found or access denied");
  }

  // Check if already linked
  const { data: existing, error: checkError } = await supabase
    .from("pet_care_team_members")
    .select("id")
    .eq("pet_id", petId)
    .eq("care_team_member_id", careTeamMemberId)
    .single();

  if (checkError && checkError.code !== "PGRST116") {
    throw checkError;
  }

  // If not already linked, create the link
  if (!existing) {
    const { error: insertError } = await supabase
      .from("pet_care_team_members")
      .insert({
        pet_id: petId,
        care_team_member_id: careTeamMemberId,
      });

    if (insertError) throw insertError;
  }
};

/**
 * Unlink a care team member from a pet
 */
export const unlinkCareTeamMemberFromPet = async (
  petId: string,
  careTeamMemberId: string
): Promise<void> => {
  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (userError) throw userError;
  if (!user) throw new Error("User not authenticated");

  // Verify pet belongs to user
  const { data: pet, error: petError } = await supabase
    .from("pets")
    .select("id")
    .eq("id", petId)
    .eq("user_id", user.id)
    .single();

  if (petError || !pet) {
    throw new Error("Pet not found or access denied");
  }

  const { error } = await supabase
    .from("pet_care_team_members")
    .delete()
    .eq("pet_id", petId)
    .eq("care_team_member_id", careTeamMemberId);

  if (error) throw error;
};

/**
 * Fetch all care team members of a specific type
 */
export const getCareTeamMembersByType = async (
  type: CareTeamMemberType
): Promise<CareTeamMember[]> => {
  const { data, error } = await supabase
    .from("vet_information")
    .select("*")
    .eq("type", type)
    .order("clinic_name", { ascending: true });

  if (error) throw error;
  return (data as CareTeamMember[]) || [];
};

/**
 * Link a care team member to multiple pets at once
 * @param petIds - Array of pet IDs to link
 * @param careTeamMemberId - The care team member ID to link
 */
export const linkCareTeamMemberToMultiplePets = async (
  petIds: string[],
  careTeamMemberId: string
): Promise<void> => {
  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (userError) throw userError;
  if (!user) throw new Error("User not authenticated");

  if (petIds.length === 0) {
    throw new Error("At least one pet must be selected");
  }

  // Verify all pets belong to user
  const { data: userPets, error: petsError } = await supabase
    .from("pets")
    .select("id")
    .in("id", petIds)
    .eq("user_id", user.id);

  if (petsError) throw petsError;

  if (!userPets || userPets.length !== petIds.length) {
    throw new Error("One or more pets not found or access denied");
  }

  // Get existing links to avoid duplicates
  const { data: existingLinks, error: checkError } = await supabase
    .from("pet_care_team_members")
    .select("pet_id")
    .in("pet_id", petIds)
    .eq("care_team_member_id", careTeamMemberId);

  if (checkError) throw checkError;

  // Filter out pets that are already linked
  const existingPetIds = new Set(existingLinks?.map((l) => l.pet_id) || []);
  const newPetIds = petIds.filter((id) => !existingPetIds.has(id));

  // Create links for pets not already linked
  if (newPetIds.length > 0) {
    const linksToInsert = newPetIds.map((petId) => ({
      pet_id: petId,
      care_team_member_id: careTeamMemberId,
    }));

    const { error: insertError } = await supabase
      .from("pet_care_team_members")
      .insert(linksToInsert);

    if (insertError) throw insertError;
  }
};

