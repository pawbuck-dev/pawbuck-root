import { supabase } from "@/utils/supabase";

export interface HouseholdInvite {
  id: string;
  code: string;
  created_by: string;
  created_at: string;
  expires_at: string | null;
  used_at: string | null;
  used_by: string | null;
  is_active: boolean;
  /** When set, accept grants only these pets; null = all owner pets. */
  pet_ids?: string[] | null;
}

export interface HouseholdMember {
  id: string;
  user_id: string;
  household_owner_id: string;
  joined_at: string;
  is_active: boolean;
}

/**
 * Generate a unique invite code
 */
function generateInviteCode(): string {
  const prefix = "MTCH";
  const year = new Date().getFullYear();
  const random = Math.random().toString(36).substring(2, 8).toUpperCase();
  return `${prefix}-${year}-${random}`;
}

/**
 * Create a new household invite code.
 * @param expiresInDays - days until expiry (default 30)
 * @param petIds - when set, accept grants only these pets; omit/empty = all owner pets (legacy)
 */
export async function createHouseholdInvite(
  expiresInDays: number = 30,
  petIds?: string[] | null
): Promise<HouseholdInvite> {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("User must be authenticated");
  }

  let code: string;
  let isUnique = false;

  // Generate unique code
  while (!isUnique) {
    code = generateInviteCode();
    const { data: existing } = await supabase
      .from("household_invites")
      .select("id")
      .eq("code", code)
      .single();

    if (!existing) {
      isUnique = true;
    }
  }

  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + expiresInDays);

  const scopedPetIds =
    petIds && petIds.length > 0 ? petIds.filter(Boolean) : null;

  const { data, error } = await supabase
    .from("household_invites")
    .insert({
      code: code!,
      created_by: user.id,
      expires_at: expiresAt.toISOString(),
      is_active: true,
      ...(scopedPetIds ? { pet_ids: scopedPetIds } : {}),
    })
    .select()
    .single();

  if (error) {
    throw error;
  }

  return data;
}

/**
 * Get all invites created by the current user
 */
export async function getMyHouseholdInvites(): Promise<HouseholdInvite[]> {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("User must be authenticated");
  }

  const { data, error } = await supabase
    .from("household_invites")
    .select("*")
    .eq("created_by", user.id)
    .order("created_at", { ascending: false });

  if (error) {
    throw error;
  }

  return data || [];
}

/**
 * Verify an invite code and get invite details
 */
export async function verifyInviteCode(
  code: string
): Promise<HouseholdInvite | null> {
  const { data, error } = await supabase
    .from("household_invites")
    .select("*")
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
 * Use an invite code to join a household (server-side RPC; RLS blocks direct recipient writes).
 */
export async function useInviteCode(code: string): Promise<void> {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("User must be authenticated");
  }

  const { data, error } = await supabase.rpc("accept_household_invite_code", {
    p_code: code.trim().toUpperCase(),
  });

  if (error) {
    throw new Error(error.message || "Failed to join household");
  }

  const result = data as {
    ok?: boolean;
    error?: string;
  } | null;

  if (!result?.ok) {
    const err = result?.error ?? "unknown";
    const messages: Record<string, string> = {
      unauthenticated: "User must be authenticated",
      invalid_code: "Invalid or expired invite code",
      expired: "Invalid or expired invite code",
      already_used: "This invite code has already been used",
      self_join: "You cannot join your own household",
      member_limit: "This household has reached the family member limit",
    };
    throw new Error(messages[err] ?? "Failed to join household");
  }
}

/**
 * Get household members for the current user (as owner)
 */
export async function getMyHouseholdMembers(): Promise<HouseholdMember[]> {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("User must be authenticated");
  }

  const { data, error } = await supabase
    .from("household_members")
    .select("*")
    .eq("household_owner_id", user.id)
    .eq("is_active", true)
    .order("joined_at", { ascending: false });

  if (error) {
    throw error;
  }

  return data || [];
}

/**
 * Remove a household member
 */
export async function removeHouseholdMember(memberId: string): Promise<void> {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("User must be authenticated");
  }

  const { data, error } = await supabase.rpc("revoke_household_member_access", {
    p_member_id: memberId,
  });

  if (error) {
    throw new Error(error.message || "Failed to remove household member");
  }

  const result = data as { ok?: boolean; error?: string } | null;
  if (!result?.ok) {
    throw new Error(result?.error === "not_found" ? "Member not found" : "Failed to remove household member");
  }
}

/**
 * Deactivate an invite code
 */
export async function deactivateInvite(inviteId: string): Promise<void> {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("User must be authenticated");
  }

  const { error } = await supabase
    .from("household_invites")
    .update({ is_active: false })
    .eq("id", inviteId)
    .eq("created_by", user.id); // Only creator can deactivate

  if (error) {
    throw error;
  }
}

