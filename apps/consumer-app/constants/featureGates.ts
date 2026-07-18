import type { SubscriptionPlan } from "@/constants/subscriptionPlans";

/** Keys must match `public.subscription_feature_gates.feature_key` and PawBuck.API. */
export const FEATURE_GATE_KEYS = [
  "milo_chat",
  "pet_journal",
  "health_briefing",
  "weekly_challenge",
  "book_vet",
  "family_sharing",
  "pet_transfer",
  "document_upload",
  "ai_journal_entry",
  "milo_symptom_trees",
  "email_parsing",
  "pet_passport_export",
  "health_alerts",
  "multi_pet",
  "multi_pet_dashboard",
  "family_permissions",
  "per_pet_email",
] as const;

export type FeatureGateKey = (typeof FEATURE_GATE_KEYS)[number];

/** Static fallback when feature-gates API is unavailable (matches pricing v1.5 migration). */
export const FEATURE_GATE_MINIMUM_PLAN_FALLBACK: Record<FeatureGateKey, SubscriptionPlan> = {
  milo_chat: "free",
  pet_journal: "free",
  health_briefing: "individual",
  weekly_challenge: "free",
  book_vet: "free",
  family_sharing: "family",
  pet_transfer: "free",
  document_upload: "individual",
  ai_journal_entry: "individual",
  milo_symptom_trees: "individual",
  email_parsing: "individual",
  pet_passport_export: "individual",
  health_alerts: "individual",
  multi_pet: "family",
  multi_pet_dashboard: "family",
  family_permissions: "family",
  per_pet_email: "family",
};

export function fallbackMinimumPlanForFeature(gateKey: string): SubscriptionPlan {
  const key = gateKey as FeatureGateKey;
  if (key in FEATURE_GATE_MINIMUM_PLAN_FALLBACK) {
    return FEATURE_GATE_MINIMUM_PLAN_FALLBACK[key];
  }
  return "individual";
}

/** Map analytics / legacy strings to canonical gate keys. */
export function resolveFeatureGateKey(feature?: string): string | undefined {
  if (!feature) return undefined;
  const map: Record<string, FeatureGateKey> = {
    milo_fab: "milo_chat",
    milo_chat: "milo_chat",
    bottom_nav_milo: "milo_chat",
    milo_journal_chat: "milo_chat",
    milo_journal_screen: "milo_chat",
    milo_journal_bar: "milo_chat",
    milo_conversation_cap: "milo_chat",
    pet_journal_home_row: "pet_journal",
    pet_journal: "pet_journal",
    health_briefing: "health_briefing",
    weekly_challenge: "weekly_challenge",
    book_vet: "book_vet",
    pet_journal_briefing_button: "health_briefing",
    pet_journal_screen: "pet_journal",
    health_briefing_screen: "health_briefing",
    vet_brief_teaser: "health_briefing",
    family_sharing: "family_sharing",
    family_access_invite: "family_sharing",
    household_invite: "family_sharing",
    pet_transfer: "pet_transfer",
    pet_transfer_create: "pet_transfer",
    pet_transfer_accept: "pet_transfer",
    document_cap: "document_upload",
    document_upload: "document_upload",
    ai_journal_entry: "ai_journal_entry",
    pet_passport_export: "pet_passport_export",
    passport_export: "pet_passport_export",
    multi_pet: "multi_pet",
    per_pet_email: "per_pet_email",
    pet_email_setup: "per_pet_email",
  };
  if (feature in map) return map[feature];
  if ((FEATURE_GATE_KEYS as readonly string[]).includes(feature)) return feature as FeatureGateKey;
  return undefined;
}
