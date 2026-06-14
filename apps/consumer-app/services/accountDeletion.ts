import type { SupabaseClient } from "@supabase/supabase-js";

/** Edge function name — must match `supabase/functions/delete-account`. */
export const DELETE_ACCOUNT_FUNCTION_NAME = "delete-account" as const;

export type AccountDeletionStatus = {
  scheduled: boolean;
  requested_at?: string;
  purge_after?: string;
  request_id?: string;
};

/**
 * Schedules account deletion (7-day grace). Hard purge runs server-side.
 */
export async function invokeDeleteAccount(
  supabase: Pick<SupabaseClient, "functions">
): Promise<{ error: Error | null; purgeAfter?: string }> {
  const { data, error } = await supabase.functions.invoke(DELETE_ACCOUNT_FUNCTION_NAME, {
    body: { action: "schedule" },
  });
  if (error) {
    return { error: new Error(error.message || "Failed to schedule account deletion") };
  }
  const purgeAfter =
    data && typeof data === "object" && "purge_after" in data
      ? String((data as { purge_after?: string }).purge_after ?? "")
      : undefined;
  return { error: null, purgeAfter: purgeAfter || undefined };
}

/** Cancels a pending account deletion during the grace window. */
export async function cancelAccountDeletion(
  supabase: Pick<SupabaseClient, "functions">
): Promise<{ error: Error | null; cancelled?: boolean }> {
  const { data, error } = await supabase.functions.invoke(DELETE_ACCOUNT_FUNCTION_NAME, {
    body: { action: "cancel" },
  });
  if (error) {
    return { error: new Error(error.message || "Failed to cancel account deletion") };
  }
  const cancelled =
    data && typeof data === "object" && "cancelled" in data
      ? Boolean((data as { cancelled?: boolean }).cancelled)
      : undefined;
  return { error: null, cancelled };
}

/** Reads deletion status via RPC (no edge round-trip). */
export async function getAccountDeletionStatus(
  supabase: Pick<SupabaseClient, "rpc">
): Promise<{ data: AccountDeletionStatus | null; error: Error | null }> {
  const { data, error } = await supabase.rpc("get_account_deletion_status");
  if (error) {
    return { data: null, error: new Error(error.message) };
  }
  if (!data || typeof data !== "object") {
    return { data: { scheduled: false }, error: null };
  }
  const row = data as Record<string, unknown>;
  return {
    data: {
      scheduled: Boolean(row.scheduled),
      requested_at: row.requested_at ? String(row.requested_at) : undefined,
      purge_after: row.purge_after ? String(row.purge_after) : undefined,
      request_id: row.request_id ? String(row.request_id) : undefined,
    },
    error: null,
  };
}
