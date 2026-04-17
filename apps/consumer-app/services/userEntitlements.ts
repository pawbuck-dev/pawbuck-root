import type { Tables } from "@/database.types";
import { supabase } from "@/utils/supabase";

export type UserEntitlementRow = Tables<"user_entitlements">;

/**
 * Loads the signed-in user's entitlement row (RLS: own row only).
 */
export async function fetchUserEntitlement(): Promise<UserEntitlementRow | null> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data, error } = await supabase
    .from("user_entitlements")
    .select("*")
    .eq("user_id", user.id)
    .maybeSingle();

  if (error) {
    console.warn("[userEntitlements]", error.message);
    return null;
  }
  return data;
}

/**
 * Premium when plan is premium and optional expiry is still in the future.
 */
export function isActivePremium(row: UserEntitlementRow | null | undefined): boolean {
  if (!row || row.plan !== "premium") return false;
  if (!row.expires_at) return true;
  return new Date(row.expires_at).getTime() > Date.now();
}
