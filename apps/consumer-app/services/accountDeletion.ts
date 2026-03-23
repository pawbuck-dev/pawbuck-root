import type { SupabaseClient } from "@supabase/supabase-js";

/** Edge function name — must match `supabase/functions/delete-account`. */
export const DELETE_ACCOUNT_FUNCTION_NAME = "delete-account" as const;

/**
 * Invokes the delete-account edge function (Apple / GDPR-style account deletion path).
 * Keeps UI layers testable by injecting the Supabase client.
 */
export async function invokeDeleteAccount(
  supabase: Pick<SupabaseClient, "functions">
): Promise<{ error: Error | null }> {
  const { error } = await supabase.functions.invoke(DELETE_ACCOUNT_FUNCTION_NAME);
  if (error) {
    return { error: new Error(error.message || "Failed to delete account") };
  }
  return { error: null };
}
