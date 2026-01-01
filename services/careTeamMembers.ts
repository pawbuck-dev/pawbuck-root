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
 * Fetch all care team members for a pet (including linked via junction table)
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

  // Also get the primary vet (via vet_information_id in pets table)
  const { data: petData, error: petError } = await supabase
    .from("pets")
    .select("vet_information_id")
    .eq("id", petId)
    .eq("user_id", user.id)
    .single();

  if (petError) throw petError;

  const careTeamMemberIds = new Set<string>();
  const members: CareTeamMember[] = [];

  // Add linked members from junction table
  if (linkedMembers) {
    linkedMembers.forEach((link: any) => {
      const member = link.vet_information;
      if (member && !careTeamMemberIds.has(member.id)) {
        careTeamMemberIds.add(member.id);
        members.push(member as CareTeamMember);
      }
    });
  }

  // Add primary vet if exists and not already added
  if (petData?.vet_information_id && !careTeamMemberIds.has(petData.vet_information_id)) {
    const { data: primaryVet, error: vetError } = await supabase
      .from("vet_information")
      .select("*")
      .eq("id", petData.vet_information_id)
      .single();

    if (!vetError && primaryVet) {
      members.push(primaryVet as CareTeamMember);
    }
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

