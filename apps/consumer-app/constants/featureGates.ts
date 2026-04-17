/** Keys must match `public.subscription_feature_gates.feature_key` and PawBuck.API. */
export const FEATURE_GATE_KEYS = [
  "milo_chat",
  "pet_journal",
  "health_briefing",
  "weekly_challenge",
  "book_vet",
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
    pet_journal_home_row: "pet_journal",
    pet_journal: "pet_journal",
    health_briefing: "health_briefing",
    weekly_challenge: "weekly_challenge",
    book_vet: "book_vet",
    pet_journal_briefing_button: "health_briefing",
    pet_journal_screen: "pet_journal",
    health_briefing_screen: "health_briefing",
  };
  if (feature in map) return map[feature];
  if ((FEATURE_GATE_KEYS as readonly string[]).includes(feature)) return feature as FeatureGateKey;
  return undefined;
}
