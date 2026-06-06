export const SUBSCRIPTION_PLANS = ["free", "individual", "family"] as const;

export type SubscriptionPlan = (typeof SUBSCRIPTION_PLANS)[number];

export const PLAN_RANK: Record<SubscriptionPlan, number> = {
  free: 0,
  individual: 1,
  family: 2,
};

/** Legacy DB value from pre-v1.5 migrations. */
export function normalizePlan(plan: string | null | undefined): SubscriptionPlan {
  if (plan === "individual" || plan === "family") return plan;
  if (plan === "premium") return "individual";
  return "free";
}

export function meetsMinimumPlan(active: SubscriptionPlan, minimum: SubscriptionPlan): boolean {
  return PLAN_RANK[active] >= PLAN_RANK[minimum];
}

export type PaywallCopyVariant =
  | "default"
  | "milo_conversation_cap"
  | "ai_journal_entry_cap"
  | "document_cap"
  | "streak_milestone"
  | "vet_brief_teaser";

export type OpenPaywallOptions = {
  source?: string;
  requiredPlan?: SubscriptionPlan;
  copyVariant?: PaywallCopyVariant;
};

export const PAYWALL_COPY: Record<
  PaywallCopyVariant,
  { title: string; body: string; requiredPlan: SubscriptionPlan }
> = {
  default: {
    title: "Upgrade PawBuck",
    body: "Unlock unlimited Milo, documents, and more.",
    requiredPlan: "individual",
  },
  milo_conversation_cap: {
    title: "Keep talking to Milo",
    body: "You've used your 3 free Milo conversations. Upgrade to Individual for unlimited AI help — even mid-symptom check.",
    requiredPlan: "individual",
  },
  ai_journal_entry_cap: {
    title: "Unlock AI journal check-ins",
    body: "You've used your 2 free AI journal entries. Upgrade to Individual for unlimited Milo-guided check-ins.",
    requiredPlan: "individual",
  },
  document_cap: {
    title: "Your health history matters",
    body: "You've reached 10 document uploads on Free. Upgrade to Individual for unlimited vet records.",
    requiredPlan: "individual",
  },
  streak_milestone: {
    title: "Unlock Milo's full memory",
    body: "You're building a great streak. Individual unlocks unlimited Milo and journal AI.",
    requiredPlan: "individual",
  },
  vet_brief_teaser: {
    title: "Full vet prep briefs",
    body: "Get a complete pre-visit summary tailored to your pet with Individual.",
    requiredPlan: "individual",
  },
};
