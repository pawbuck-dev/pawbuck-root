import { TablesInsert, TablesUpdate } from "@/database.types";
import { supabase } from "@/utils/supabase";

/**
 * Get user preferences for the authenticated user
 */
export const getUserPreferences = async (userId: string) => {
  const { data, error } = await supabase
    .from("user_preferences")
    .select("*")
    .eq("user_id", userId)
    .single();

  if (error) {
    // If no preferences exist, return null (not an error)
    return null;
  }

  return data;
};

/**
 * Create default user preferences
 */
export const createUserPreferences = async (
  userId: string,
  preferences?: TablesUpdate<"user_preferences">
) => {
  const defaultPreferences: TablesInsert<"user_preferences"> = {
    user_id: userId,
    vaccination_reminder_days: preferences?.vaccination_reminder_days ?? 14,
  };

  const { data, error } = await supabase
    .from("user_preferences")
    .insert(defaultPreferences)
    .select()
    .single();

  if (error) throw error;

  return data;
};

/**
 * Update user preferences
 */
export const updateUserPreferences = async (
  userId: string,
  preferences: TablesUpdate<"user_preferences">
) => {
  const { data, error } = await supabase
    .from("user_preferences")
    .update(preferences)
    .eq("user_id", userId)
    .select()
    .single();

  if (error) throw error;

  return data;
};

/**
 * Upsert user preferences (update if exists, create if not)
 */
export const upsertUserPreferences = async (
  userId: string,
  preferences: Partial<TablesInsert<"user_preferences">>
) => {
  const { data, error } = await supabase
    .from("user_preferences")
    .upsert(
      {
        user_id: userId,
        vaccination_reminder_days: preferences.vaccination_reminder_days ?? 14,
      },
      {
        onConflict: "user_id",
      }
    )
    .select()
    .single();

  if (error) throw error;

  return data;
};
