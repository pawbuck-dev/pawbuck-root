/**
 * Contract test: PawBuck v1.5 pricing matrix (docs/PRICING.md + subscription_limits seed).
 * Fails when product limits drift from canonical tier definitions.
 */
import { FEATURE_GATE_KEYS, FEATURE_GATE_MINIMUM_PLAN_FALLBACK } from "@/constants/featureGates";
import { PLAN_RANK, SUBSCRIPTION_PLANS, type SubscriptionPlan } from "@/constants/subscriptionPlans";

/** Mirrors supabase/migrations/20260603130100_pricing_v15_tiers.sql subscription_limits seed. */
const SUBSCRIPTION_LIMITS: Record<
  SubscriptionPlan,
  {
    maxPets: number | null;
    maxDocuments: number | null;
    maxFamilyMembers: number;
    maxMiloConversations: number | null;
    maxAiJournalEntries: number | null;
  }
> = {
  free: {
    maxPets: 1,
    maxDocuments: 10,
    maxFamilyMembers: 0,
    maxMiloConversations: 3,
    maxAiJournalEntries: 2,
  },
  individual: {
    maxPets: 1,
    maxDocuments: null,
    maxFamilyMembers: 0,
    maxMiloConversations: null,
    maxAiJournalEntries: null,
  },
  family: {
    maxPets: null,
    maxDocuments: null,
    maxFamilyMembers: 5,
    maxMiloConversations: null,
    maxAiJournalEntries: null,
  },
};

const FEATURE_MINIMUM_PLAN = FEATURE_GATE_MINIMUM_PLAN_FALLBACK;

describe("pricing tier matrix (v1.5 contract)", () => {
  it("defines all three canonical plans in rank order", () => {
    expect(SUBSCRIPTION_PLANS).toEqual(["free", "individual", "family"]);
    expect(PLAN_RANK.free).toBeLessThan(PLAN_RANK.individual);
    expect(PLAN_RANK.individual).toBeLessThan(PLAN_RANK.family);
  });

  it("matches free-tier numeric caps from PRICING.md", () => {
    expect(SUBSCRIPTION_LIMITS.free.maxPets).toBe(1);
    expect(SUBSCRIPTION_LIMITS.free.maxDocuments).toBe(10);
    expect(SUBSCRIPTION_LIMITS.free.maxMiloConversations).toBe(3);
    expect(SUBSCRIPTION_LIMITS.free.maxAiJournalEntries).toBe(2);
    expect(SUBSCRIPTION_LIMITS.free.maxFamilyMembers).toBe(0);
  });

  it("individual unlocks unlimited usage caps but keeps single-pet limit", () => {
    expect(SUBSCRIPTION_LIMITS.individual.maxPets).toBe(1);
    expect(SUBSCRIPTION_LIMITS.individual.maxDocuments).toBeNull();
    expect(SUBSCRIPTION_LIMITS.individual.maxMiloConversations).toBeNull();
    expect(SUBSCRIPTION_LIMITS.individual.maxAiJournalEntries).toBeNull();
  });

  it("family unlocks multi-pet and household sharing cap", () => {
    expect(SUBSCRIPTION_LIMITS.family.maxPets).toBeNull();
    expect(SUBSCRIPTION_LIMITS.family.maxFamilyMembers).toBe(5);
  });

  it("covers every registered feature gate key with a minimum plan", () => {
    for (const key of FEATURE_GATE_KEYS) {
      expect(FEATURE_MINIMUM_PLAN[key]).toBeDefined();
    }
  });

  it("gates Individual-only features correctly", () => {
    const individualFeatures = [
      "milo_symptom_trees",
      "health_briefing",
      "email_parsing",
      "pet_passport_export",
      "health_alerts",
    ] as const;
    for (const key of individualFeatures) {
      expect(FEATURE_MINIMUM_PLAN[key]).toBe("individual");
    }
  });

  it("gates Family-only features correctly", () => {
    const familyFeatures = [
      "family_sharing",
      "multi_pet",
      "multi_pet_dashboard",
      "family_permissions",
      "per_pet_email",
    ] as const;
    for (const key of familyFeatures) {
      expect(FEATURE_MINIMUM_PLAN[key]).toBe("family");
    }
  });

  it("keeps free-tier taste features at free minimum plan", () => {
    expect(FEATURE_MINIMUM_PLAN.milo_chat).toBe("free");
    expect(FEATURE_MINIMUM_PLAN.pet_journal).toBe("free");
    expect(FEATURE_MINIMUM_PLAN.book_vet).toBe("free");
    expect(FEATURE_MINIMUM_PLAN.pet_transfer).toBe("free");
  });
});
