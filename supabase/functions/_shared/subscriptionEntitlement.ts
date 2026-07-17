/**
 * Server-side plan checks for Edge functions (service role).
 */
import type { SupabaseClient } from "jsr:@supabase/supabase-js@2";

export type SubscriptionPlan = "free" | "individual" | "family" | "premium";

const PLAN_RANK: Record<string, number> = {
  free: 0,
  premium: 1,
  individual: 1,
  family: 2,
};

function normalizePlan(raw: string | null | undefined): SubscriptionPlan {
  if (raw === "family") return "family";
  if (raw === "individual" || raw === "premium") return "individual";
  return "free";
}

function isActiveRow(row: {
  plan: string;
  expires_at: string | null;
  is_founding_member?: boolean | null;
}): boolean {
  if (row.is_founding_member) return true;
  const plan = normalizePlan(row.plan);
  if (plan === "free") return false;
  if (!row.expires_at) return true;
  return new Date(row.expires_at).getTime() > Date.now();
}

/** Missing or false `monetization_enabled` → free launch (treat as Family). */
export async function isMonetizationEnabled(supabase: SupabaseClient): Promise<boolean> {
  const { data, error } = await supabase
    .from("app_feature_flags")
    .select("enabled")
    .eq("key", "monetization_enabled")
    .maybeSingle();

  if (error || !data) return false;
  return data.enabled === true;
}

export async function getOwnerActivePlan(
  supabase: SupabaseClient,
  userId: string,
): Promise<SubscriptionPlan> {
  if (!(await isMonetizationEnabled(supabase))) {
    return "family";
  }

  const { data, error } = await supabase
    .from("user_entitlements")
    .select("plan, expires_at, is_founding_member")
    .eq("user_id", userId)
    .maybeSingle();

  if (error || !data || !isActiveRow(data)) return "free";
  return normalizePlan(data.plan);
}

export async function ownerMeetsMinimumPlan(
  supabase: SupabaseClient,
  userId: string,
  minimumPlan: "individual" | "family",
): Promise<boolean> {
  const active = await getOwnerActivePlan(supabase, userId);
  return PLAN_RANK[active] >= PLAN_RANK[minimumPlan];
}

/** True when owner plan rank meets a subscription_feature_gates minimum_plan row. */
export async function ownerMeetsFeatureGate(
  supabase: SupabaseClient,
  userId: string,
  featureKey: string,
): Promise<boolean> {
  if (!(await isMonetizationEnabled(supabase))) {
    return true;
  }

  const { data } = await supabase
    .from("subscription_feature_gates")
    .select("minimum_plan")
    .eq("feature_key", featureKey)
    .maybeSingle();

  const minPlan = normalizePlan(data?.minimum_plan ?? "free");
  const active = await getOwnerActivePlan(supabase, userId);
  return PLAN_RANK[active] >= PLAN_RANK[minPlan];
}

export async function getFoundingMemberStats(
  supabase: SupabaseClient,
): Promise<{ purchaseCount: number; spotsRemaining: number }> {
  const { data } = await supabase
    .from("founding_member_counter")
    .select("purchase_count")
    .eq("id", 1)
    .maybeSingle();
  const purchaseCount = data?.purchase_count ?? 0;
  return {
    purchaseCount,
    spotsRemaining: Math.max(0, 500 - purchaseCount),
  };
}
