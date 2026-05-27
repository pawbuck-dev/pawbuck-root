import { Json, Tables, TablesInsert, TablesUpdate } from "@/database.types";
import { isLocalPhotoUri, uploadPetProfilePhotoFromUri } from "@/utils/petPhotoUpload";
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
    .is("deleted_at", null)
    .order("created_at", { ascending: false });

  if (error) throw error;

  return data;
};

export const createPet = async (petData: TablesInsert<"pets">) => {
  // Align the REST client's JWT with storage (same identity PostgREST sends to Postgres).
  const { error: refreshError } = await supabase.auth.refreshSession();
  if (refreshError) {
    const {
      data: { session: fallback },
    } = await supabase.auth.getSession();
    if (!fallback?.access_token) {
      throw refreshError;
    }
  }

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError) throw userError;
  if (!user) {
    throw new Error("User must be authenticated to create a pet");
  }

  const {
    data: { session },
    error: sessionError,
  } = await supabase.auth.getSession();
  if (sessionError) throw sessionError;
  if (!session?.access_token) {
    throw new Error("Session expired — sign in again to create a pet");
  }

  const { user_id: _stale, id: _clientId, photo_url, ...insertFields } = petData as TablesInsert<"pets"> &
    Record<string, unknown>;

  const localPhotoUri = isLocalPhotoUri(photo_url) ? photo_url!.trim() : null;
  const storagePhotoPath =
    photo_url && !localPhotoUri ? String(photo_url).trim() || null : null;

  const { data, error } = await supabase.rpc("insert_pet_for_current_user", {
    p_fields: {
      ...insertFields,
      ...(storagePhotoPath ? { photo_url: storagePhotoPath } : {}),
    } as Json,
  });

  if (error) throw error;
  if (!data) {
    throw new Error("No data returned from insert_pet_for_current_user");
  }

  let created = data as Tables<"pets">;

  if (localPhotoUri && created.id) {
    try {
      const uploadedPath = await uploadPetProfilePhotoFromUri(
        localPhotoUri,
        user.id,
        created.id,
        created.name,
      );
      created = await updatePet(created.id, { photo_url: uploadedPath });
    } catch (uploadError) {
      console.error("Failed to upload pet profile photo during create:", uploadError);
    }
  }

  return created;
};

export const updatePet = async (
  petId: string,
  petData: TablesUpdate<"pets">
) => {
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
 * Transfer pet ownership to a new owner by email
 */
export const transferPetOwnership = async (
  petId: string,
  newOwnerEmail: string
) => {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("User must be authenticated to transfer pet ownership");
  }

  // Verify pet belongs to current user
  const { data: pet, error: petError } = await supabase
    .from("pets")
    .select("id, user_id")
    .eq("id", petId)
    .eq("user_id", user.id)
    .single();

  if (petError) throw petError;
  if (!pet) {
    throw new Error(
      "Pet not found or you don't have permission to transfer it"
    );
  }

  // Resolving new owner by email requires auth admin or RPC (not exposed on PostgREST as auth.users).
  throw new Error(
    "transferPetOwnership: Please implement based on your auth system. This requires new owner's user ID."
  );

  // Alternative implementation if you have access to user management:
  // const { data: newOwnerId } = await supabase.rpc('get_user_id_by_email', { email: newOwnerEmail });
  // Then update: .update({ user_id: newOwnerId }).eq("id", petId)
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
    p_exclude_pet_id: excludePetId ?? undefined,
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
  const trimmed = emailId.trim().toLowerCase();
  if (!trimmed) {
    return { isValid: false, error: "Pet email is required" };
  }

  if (trimmed.length < 3) {
    return { isValid: false, error: "Pet email must be at least 3 characters" };
  }

  if (trimmed.length > 30) {
    return { isValid: false, error: "Pet email must be at most 30 characters" };
  }

  // Only allow lowercase letters, numbers, dots, hyphens, underscores
  const validPattern = /^[a-z0-9][a-z0-9._-]*[a-z0-9]$|^[a-z0-9]$/;
  if (!validPattern.test(trimmed)) {
    return {
      isValid: false,
      error:
        "Pet email can only contain letters, numbers, dots, hyphens, and underscores. Cannot start or end with special characters.",
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
  if (reservedWords.includes(trimmed)) {
    return { isValid: false, error: "This pet email is reserved" };
  }

  return { isValid: true };
};
