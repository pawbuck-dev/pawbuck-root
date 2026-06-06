import { persistOwnerDisplayNameForSession } from "@/services/authDisplayName";
import { uploadOwnerProfilePhotoFromUri } from "@/utils/ownerProfilePhotoUpload";
import { supabase } from "@/utils/supabase";

export interface UserProfile {
  full_name: string | null;
  email: string;
  phone: string | null;
  address: string | null;
  profile_photo_path: string | null;
}

export type UpdateUserProfileInput = {
  full_name?: string | null;
  phone?: string | null;
  address?: string | null;
  /** Upload from device and persist path (iOS + Android local URIs). */
  new_profile_photo_uri?: string | null;
  /** Clear custom photo; OAuth avatar may still show if provider supplied one. */
  clear_profile_photo?: boolean;
};

/**
 * Get user profile information combining auth.users and user_preferences
 */
export const getUserProfile = async (): Promise<UserProfile> => {
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError) throw userError;
  if (!user) throw new Error("User not authenticated");

  const { data: preferences, error: prefsError } = await supabase
    .from("user_preferences")
    .select("full_name, phone, address, profile_photo_path")
    .eq("user_id", user.id)
    .single();

  if (prefsError && prefsError.code !== "PGRST116") {
    throw prefsError;
  }

  return {
    full_name: preferences?.full_name || null,
    email: user.email || "",
    phone: preferences?.phone || null,
    address: preferences?.address || null,
    profile_photo_path: preferences?.profile_photo_path ?? null,
  };
};

/**
 * Update user profile: display name, phone, address, optional profile photo.
 * Email remains read-only (OAuth provider).
 */
export const updateUserProfile = async (data: UpdateUserProfileInput): Promise<void> => {
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError) throw userError;
  if (!user) throw new Error("User not authenticated");

  if (data.full_name !== undefined) {
    const trimmed = data.full_name?.trim() ?? "";
    if (!trimmed) {
      throw new Error("Name is required");
    }
    await persistOwnerDisplayNameForSession(trimmed);
  }

  let profilePhotoPath: string | null | undefined;
  if (data.clear_profile_photo) {
    profilePhotoPath = null;
  } else if (data.new_profile_photo_uri?.trim()) {
    profilePhotoPath = await uploadOwnerProfilePhotoFromUri(
      data.new_profile_photo_uri.trim(),
      user.id
    );
  }

  const { data: existing } = await supabase
    .from("user_preferences")
    .select("id")
    .eq("user_id", user.id)
    .single();

  const prefsPayload: Record<string, unknown> = {
    phone: data.phone ?? null,
    address: data.address ?? null,
  };
  if (profilePhotoPath !== undefined) {
    prefsPayload.profile_photo_path = profilePhotoPath;
  }

  if (existing) {
    const { error } = await supabase
      .from("user_preferences")
      .update(prefsPayload)
      .eq("user_id", user.id);

    if (error) throw error;
  } else {
    const { error } = await supabase.from("user_preferences").insert({
      user_id: user.id,
      phone: data.phone ?? null,
      address: data.address ?? null,
      profile_photo_path: profilePhotoPath ?? null,
      vaccination_reminder_days: 14,
    });

    if (error) throw error;
  }
};
