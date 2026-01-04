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
 * Create a new household invite code
 */
export async function createHouseholdInvite(
  expiresInDays: number = 30
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

  const { data, error } = await supabase
    .from("household_invites")
    .insert({
      code: code!,
      created_by: user.id,
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
 * Use an invite code to join a household
 */
export async function useInviteCode(code: string): Promise<void> {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("User must be authenticated");
  }

  // Verify the code
  const invite = await verifyInviteCode(code);
  if (!invite) {
    throw new Error("Invalid or expired invite code");
  }

  // Check if user is trying to join their own household
  if (invite.created_by === user.id) {
    throw new Error("You cannot join your own household");
  }

  // Check if user is already a member
  const { data: existingMember } = await supabase
    .from("household_members")
    .select("id")
    .eq("user_id", user.id)
    .eq("household_owner_id", invite.created_by)
    .eq("is_active", true)
    .single();

  if (existingMember) {
    throw new Error("You are already a member of this household");
  }

  // Start a transaction-like operation
  // Mark invite as used
  const { error: updateError } = await supabase
    .from("household_invites")
    .update({
      used_at: new Date().toISOString(),
      used_by: user.id,
      is_active: false,
    })
    .eq("id", invite.id);

  if (updateError) {
    throw updateError;
  }

  // Add user as household member
  const { error: insertError } = await supabase
    .from("household_members")
    .insert({
      user_id: user.id,
      household_owner_id: invite.created_by,
      is_active: true,
    });

  if (insertError) {
    // Rollback: reactivate the invite
    await supabase
      .from("household_invites")
      .update({
        used_at: null,
        used_by: null,
        is_active: true,
      })
      .eq("id", invite.id);
    throw insertError;
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

  const { error } = await supabase
    .from("household_members")
    .update({ is_active: false })
    .eq("id", memberId)
    .eq("household_owner_id", user.id); // Only owner can remove

  if (error) {
    throw error;
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

