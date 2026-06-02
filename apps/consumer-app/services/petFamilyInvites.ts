import { supabase } from "@/utils/supabase";

export type PetFamilyRole = "view_only" | "contributor" | "admin";

export type PetFamilyInviteAcceptResult = {
  petId: string;
  role: PetFamilyRole;
};

const INVITE_ERROR_MESSAGES: Record<string, string> = {
  unauthenticated: "Please sign in to accept this invite",
  invalid_token: "This invite link is invalid",
  expired: "This invite has expired",
  not_pending: "This invite is no longer available",
  email_mismatch:
    "This invite was sent to a different email address. Sign in with the invited email or ask for a new invite.",
  already_owner: "You already own this pet",
  member_limit: "This pet has reached the family member limit",
  pet_not_found: "This pet is no longer available",
};

function mapInviteError(error: string | undefined, fallback: string): string {
  if (!error) return fallback;
  return INVITE_ERROR_MESSAGES[error] ?? fallback;
}

/**
 * Send a per-pet family invite email (Edge function).
 */
export async function sendPetFamilyInvite(input: {
  petId: string;
  email: string;
  role: PetFamilyRole;
}): Promise<{ inviteId?: string; emailSent?: boolean }> {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("User must be authenticated");
  }

  const { data, error } = await supabase.functions.invoke<{
    ok?: boolean;
    inviteId?: string;
    emailSent?: boolean;
    error?: string;
  }>("send-family-invite", {
    body: {
      petId: input.petId,
      email: input.email.trim().toLowerCase(),
      role: input.role,
    },
  });

  if (error) {
    throw new Error(error.message || "Failed to send invite");
  }

  if (!data?.ok) {
    throw new Error(data?.error || "Failed to send invite");
  }

  return { inviteId: data.inviteId, emailSent: data.emailSent };
}

/**
 * Accept an email family invite token (Edge function wraps RPC).
 */
export async function acceptPetFamilyInviteToken(
  token: string
): Promise<PetFamilyInviteAcceptResult> {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("User must be authenticated");
  }

  const trimmed = token.trim();
  if (!trimmed) {
    throw new Error("Missing invite token");
  }

  const { data, error } = await supabase.functions.invoke<{
    ok?: boolean;
    error?: string;
    pet_id?: string;
    role?: PetFamilyRole;
  }>("process-invite-token", {
    body: { token: trimmed },
  });

  if (error) {
    throw new Error(error.message || "Failed to accept invite");
  }

  if (!data?.ok) {
    throw new Error(mapInviteError(data?.error, "Failed to accept invite"));
  }

  if (!data.pet_id || !data.role) {
    throw new Error("Invalid server response");
  }

  return { petId: data.pet_id, role: data.role };
}

export function resolveInviteTokenFromParams(params: {
  token?: string | string[];
  inviteToken?: string | string[];
}): string | undefined {
  const pick = (v: string | string[] | undefined): string | undefined => {
    if (v == null) return undefined;
    const s = Array.isArray(v) ? v[0] : v;
    const t = s?.trim();
    return t ? t : undefined;
  };
  return pick(params.inviteToken) ?? pick(params.token);
}

export { mapInviteError as petFamilyInviteErrorMessage };
