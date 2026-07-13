import type { SupabaseClient } from "@supabase/supabase-js";

/** Edge function name — must match `supabase/functions/revenuecat-sync-entitlement`. */
export const REVENUECAT_SYNC_ENTITLEMENT_FUNCTION = "revenuecat-sync-entitlement" as const;

export type RevenueCatSyncResult = {
  ok: boolean;
  plan?: string;
  skipped?: boolean;
  reason?: string;
  error?: string;
};

/**
 * Server-side sync from RevenueCat → `user_entitlements` (uses secret API key in edge function).
 * Call after purchase/restore so admin portal and API gates match the app.
 */
export async function syncRevenueCatEntitlementToSupabase(
  supabase: Pick<SupabaseClient, "functions">
): Promise<RevenueCatSyncResult> {
  const { data, error } = await supabase.functions.invoke(REVENUECAT_SYNC_ENTITLEMENT_FUNCTION, {
    body: {},
  });

  if (error) {
    if (__DEV__) {
      console.warn("[RevenueCat] Supabase entitlement sync failed:", error.message);
    }
    return { ok: false, error: error.message };
  }

  const row = data as Record<string, unknown> | null;
  if (!row || row.ok !== true) {
    const message =
      row && typeof row.error === "string" ? row.error : "entitlement sync returned unexpected response";
    if (__DEV__) {
      console.warn("[RevenueCat] Supabase entitlement sync:", message);
    }
    return { ok: false, error: message };
  }

  if (__DEV__) {
    console.log(
      "[RevenueCat] Supabase entitlement synced:",
      row.plan ?? "unknown",
      row.skipped ? `(skipped: ${row.reason})` : ""
    );
  }

  return {
    ok: true,
    plan: typeof row.plan === "string" ? row.plan : undefined,
    skipped: row.skipped === true,
    reason: typeof row.reason === "string" ? row.reason : undefined,
  };
}
