import { TablesInsert, TablesUpdate } from "@/database.types";
import { supabase } from "@/utils/supabase";

export const getPets = async () => {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("User must be authenticated to fetch pets");
  }

  const { data, error } = await supabase
    .from("pets")
    .select("*")
    .eq("user_id", user.id)
    .is("deleted_at", null)
    .order("created_at", { ascending: false });

  if (error) throw error;

  return data;
};

export const createPet = async (petData: TablesInsert<"pets">) => {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("User must be authenticated to create a pet");
  }

  const { data, error } = await supabase
    .from("pets")
    .insert(petData)
    .select()
    .single();

  if (error) throw error;

  return data;
};

export const updatePet = async (petId: string, petData: TablesUpdate<"pets">) => {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("User must be authenticated to update a pet");
  }

  const { data, error } = await supabase
    .from("pets")
    .update(petData)
    .eq("id", petId)
    .eq("user_id", user.id)
    .select()
    .single();

  if (error) throw error;

  return data;
};

export const deletePet = async (petId: string) => {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("User must be authenticated to delete a pet");
  }

  // Soft delete by setting deleted_at timestamp
  const { data, error } = await supabase
    .from("pets")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", petId)
    .eq("user_id", user.id)
    .select()
    .single();

  if (error) throw error;

  return data;
};

/**
 * Link a vet information record to a pet
 */
export const linkVetToPet = async (petId: string, vetInformationId: string | null) => {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("User must be authenticated to link vet to pet");
  }

  const { data, error } = await supabase
    .from("pets")
    .update({ vet_information_id: vetInformationId })
    .eq("id", petId)
    .eq("user_id", user.id)
    .select()
    .single();

  if (error) throw error;

  return data;
};

/**
 * Check if an email_id is available for use
 * @param emailId - The email ID to check (local part only, e.g., "buddy")
 * @param excludePetId - Optional pet ID to exclude from the check (for updates)
 * @returns true if available, false if taken
 */
export const checkEmailIdAvailable = async (
  emailId: string,
  excludePetId?: string
): Promise<boolean> => {
  const { data, error } = await supabase.rpc("check_email_id_available", {
    p_email_id: emailId.toLowerCase(),
    p_exclude_pet_id: excludePetId || null,
  });

  if (error) throw error;
  return data;
};

/**
 * Validate email_id format
 * @param emailId - The email ID to validate
 * @returns Object with isValid boolean and error message if invalid
 */
export const validateEmailIdFormat = (
  emailId: string
): { isValid: boolean; error?: string } => {
  if (!emailId) {
    return { isValid: false, error: "Email ID is required" };
  }

  if (emailId.length < 3) {
    return { isValid: false, error: "Email ID must be at least 3 characters" };
  }

  if (emailId.length > 30) {
    return { isValid: false, error: "Email ID must be at most 30 characters" };
  }

  // Only allow lowercase letters, numbers, dots, hyphens, underscores
  const validPattern = /^[a-z0-9][a-z0-9._-]*[a-z0-9]$|^[a-z0-9]$/;
  if (!validPattern.test(emailId.toLowerCase())) {
    return {
      isValid: false,
      error:
        "Email ID can only contain letters, numbers, dots, hyphens, and underscores. Cannot start or end with special characters.",
    };
  }

  // Check for reserved words
  const reservedWords = [
    "admin",
    "support",
    "info",
    "noreply",
    "help",
    "contact",
    "sales",
    "billing",
    "team",
    "hello",
    "pawbuck",
  ];
  if (reservedWords.includes(emailId.toLowerCase())) {
    return { isValid: false, error: "This email ID is reserved" };
  }

  return { isValid: true };
};
