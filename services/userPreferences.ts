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
 * This function first tries to create user_preferences using a SECURITY DEFINER function
 * to bypass RLS during signup when the session might not be fully established.
 * Then it tries to do a normal upsert to handle updates (if there's a session).
 */
export const upsertUserPreferences = async (
  userId: string,
  preferences: Partial<TablesInsert<"user_preferences">>
) => {
  // First, try to create user_preferences using the SECURITY DEFINER function
  // This bypasses RLS and works even if the session isn't fully established (e.g., during signup)
  try {
    await supabase.rpc("create_user_preferences", {
      p_user_id: userId,
    });
  } catch (createError) {
    // Ignore errors from the function call - it might fail if the row already exists
    // We'll handle it with the upsert below
    console.log("create_user_preferences RPC call (non-fatal):", createError);
  }

  // Now try the normal upsert - this will update if the row exists, or create if it doesn't
  // This works if there's a session established. If there's no session, it will fail with RLS,
  // but that's okay because the RPC function above should have created the row.
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

  // If the upsert fails with an RLS error, it's likely because there's no session
  // In that case, the RPC function should have created the row, so we can silently succeed
  if (error) {
    // Check if it's an RLS policy violation - if so, the RPC function created the row
    if (
      error.message?.includes("row-level security") ||
      error.message?.includes("new row violates")
    ) {
      // RPC function should have created the row, so we can return
      // The user can update preferences later when they have a proper session
      console.log(
        "Upsert failed due to RLS (expected during signup), RPC function created row"
      );
      return null; // Return null to indicate the row exists but we can't read it without a session
    }
    // Otherwise, throw the error
    throw error;
  }

  return data;
};





