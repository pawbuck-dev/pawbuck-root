import { supabase } from "@/utils/supabase";

export interface UserProfile {
  full_name: string | null;
  email: string;
  phone: string | null;
  address: string | null;
}

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

  // Get user preferences (which includes full_name, phone, address)
  const { data: preferences, error: prefsError } = await supabase
    .from("user_preferences")
    .select("full_name, phone, address")
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
  };
};

/**
 * Update user profile information (phone and address in user_preferences)
 * Note: full_name and email are managed through auth.users
 */
export const updateUserProfile = async (data: {
  phone?: string | null;
  address?: string | null;
}): Promise<void> => {
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError) throw userError;
  if (!user) throw new Error("User not authenticated");

  // Check if user_preferences record exists
  const { data: existing } = await supabase
    .from("user_preferences")
    .select("id")
    .eq("user_id", user.id)
    .single();

  if (existing) {
    // Update existing record
    const { error } = await supabase
      .from("user_preferences")
      .update({
        phone: data.phone ?? null,
        address: data.address ?? null,
      })
      .eq("user_id", user.id);

    if (error) throw error;
  } else {
    // Create new record with profile fields
    const { error } = await supabase.from("user_preferences").insert({
      user_id: user.id,
      phone: data.phone ?? null,
      address: data.address ?? null,
      vaccination_reminder_days: 14, // Default value
    });

    if (error) throw error;
  }
};


