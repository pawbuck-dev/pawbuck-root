import { supabase } from "@/utils/supabase";

export interface PetTransfer {
  id: string;
  code: string;
  pet_id: string;
  from_user_id: string;
  created_at: string;
  expires_at: string | null;
  used_at: string | null;
  to_user_id: string | null;
  is_active: boolean;
}

/**
 * Generate a unique transfer code
 */
function generateTransferCode(petName?: string): string {
  const prefix = "TRF";
  const petPrefix = petName
    ? petName.toUpperCase().substring(0, 4).replace(/[^A-Z]/g, "")
    : "PET";
  const year = new Date().getFullYear();
  const random = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `${prefix}-${petPrefix}-${year}-${random}`;
}

/**
 * Create a new pet transfer code
 */
export async function createPetTransfer(
  petId: string,
  expiresInDays: number = 30
): Promise<PetTransfer> {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("User must be authenticated");
  }

  // Verify the pet belongs to the user
  const { data: pet, error: petError } = await supabase
    .from("pets")
    .select("id, name, user_id")
    .eq("id", petId)
    .eq("user_id", user.id)
    .single();

  if (petError || !pet) {
    throw new Error("Pet not found or you don't have permission to transfer this pet");
  }

  // Check if there's already an active transfer for this pet
  const { data: existingTransfer } = await supabase
    .from("pet_transfers")
    .select("id")
    .eq("pet_id", petId)
    .eq("from_user_id", user.id)
    .eq("is_active", true)
    .is("used_at", null)
    .single();

  if (existingTransfer) {
    throw new Error("An active transfer already exists for this pet. Please cancel it first or wait for it to expire.");
  }

  let code: string;
  let isUnique = false;

  // Generate unique code
  while (!isUnique) {
    code = generateTransferCode(pet.name);
    const { data: existing } = await supabase
      .from("pet_transfers")
      .select("id")
      .eq("code", code)
      .single();

    if (!existing) {
      isUnique = true;
    }
  }

  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + expiresInDays);

  const { data, error } = await supabase
    .from("pet_transfers")
    .insert({
      code: code!,
      pet_id: petId,
      from_user_id: user.id,
      expires_at: expiresAt.toISOString(),
      is_active: true,
    })
    .select()
    .single();

  if (error) {
    throw error;
  }

  return data;
}

/**
 * Get active transfers created by the current user
 */
export async function getMyPetTransfers(): Promise<PetTransfer[]> {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("User must be authenticated");
  }

  const { data, error } = await supabase
    .from("pet_transfers")
    .select("*")
    .eq("from_user_id", user.id)
    .order("created_at", { ascending: false });

  if (error) {
    throw error;
  }

  return data || [];
}

/**
 * Verify a transfer code and get transfer details
 */
export async function verifyTransferCode(
  code: string
): Promise<PetTransfer | null> {
  const { data, error } = await supabase
    .from("pet_transfers")
    .select("*, pets(*)")
    .eq("code", code.toUpperCase().trim())
    .eq("is_active", true)
    .single();

  if (error) {
    if (error.code === "PGRST116") {
      // No rows returned
      return null;
    }
    throw error;
  }

  // Check if expired
  if (data.expires_at && new Date(data.expires_at) < new Date()) {
    return null;
  }

  // Check if already used
  if (data.used_at) {
    return null;
  }

  return data;
}

/**
 * Use a transfer code to transfer pet ownership
 */
export async function useTransferCode(code: string): Promise<void> {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("User must be authenticated");
  }

  // Verify the code
  const transfer = await verifyTransferCode(code);
  if (!transfer) {
    throw new Error("Invalid or expired transfer code");
  }

  // Check if user is trying to transfer to themselves
  if (transfer.from_user_id === user.id) {
    throw new Error("You cannot transfer a pet to yourself");
  }

  // Start transaction-like operation
  // Mark transfer as used
  const { error: updateError } = await supabase
    .from("pet_transfers")
    .update({
      used_at: new Date().toISOString(),
      to_user_id: user.id,
      is_active: false,
    })
    .eq("id", transfer.id);

  if (updateError) {
    throw updateError;
  }

  // Transfer pet ownership
  const { error: petUpdateError } = await supabase
    .from("pets")
    .update({
      user_id: user.id,
    })
    .eq("id", transfer.pet_id);

  if (petUpdateError) {
    // Rollback: reactivate the transfer
    const { error: rollbackError } = await supabase
      .from("pet_transfers")
      .update({
        used_at: null,
        to_user_id: null,
        is_active: true,
      })
      .eq("id", transfer.id);
    
    if (rollbackError) {
      console.error("Critical: Failed to rollback pet transfer", rollbackError);
      // Log to error tracking service if available
      // This is a critical error that could leave data inconsistent
    }
    
    throw petUpdateError;
  }
}

/**
 * Cancel/deactivate a transfer code
 */
export async function cancelPetTransfer(transferId: string): Promise<void> {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("User must be authenticated");
  }

  const { error } = await supabase
    .from("pet_transfers")
    .update({ is_active: false })
    .eq("id", transferId)
    .eq("from_user_id", user.id); // Only creator can cancel

  if (error) {
    throw error;
  }
}

