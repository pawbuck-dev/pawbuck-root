import type { SubscriptionPlan } from "@/constants/subscriptionPlans";
import { normalizePlan } from "@/constants/subscriptionPlans";
import type { Tables } from "@/database.types";
import { supabase } from "@/utils/supabase";

export type UserEntitlementRow = Tables<"user_entitlements"> & {
  is_founding_member?: boolean | null;
  product_id?: string | null;
};

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
  return data as UserEntitlementRow | null;
}

export function getActivePlanFromRow(row: UserEntitlementRow | null | undefined): SubscriptionPlan {
  if (!row) return "free";
  if (row.is_founding_member) return normalizePlan(row.plan);
  if (row.plan === "free") return "free";
  if (row.expires_at && new Date(row.expires_at).getTime() <= Date.now()) return "free";
  return normalizePlan(row.plan);
}

/** Individual or Family with active subscription (or founding). */
export function isActivePremium(row: UserEntitlementRow | null | undefined): boolean {
  const plan = getActivePlanFromRow(row);
  return plan === "individual" || plan === "family";
}

export function isFoundingMember(row: UserEntitlementRow | null | undefined): boolean {
  return row?.is_founding_member === true;
}
