import { resolveEffectiveSubscriptionPlan } from "@/constants/subscriptionPlans";

describe("resolveEffectiveSubscriptionPlan", () => {
  it("prefers Supabase admin grant over API free", () => {
    expect(resolveEffectiveSubscriptionPlan(["free", "individual", "free"])).toBe("individual");
  });

  it("prefers API activePlan over stored free", () => {
    expect(resolveEffectiveSubscriptionPlan(["free", "family"])).toBe("family");
  });

  it("returns free when all sources are free or missing", () => {
    expect(resolveEffectiveSubscriptionPlan(["free", null, undefined])).toBe("free");
  });
});
