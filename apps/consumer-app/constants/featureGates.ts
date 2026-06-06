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
  };
  if (feature in map) return map[feature];
  if ((FEATURE_GATE_KEYS as readonly string[]).includes(feature)) return feature as FeatureGateKey;
  return undefined;
}
