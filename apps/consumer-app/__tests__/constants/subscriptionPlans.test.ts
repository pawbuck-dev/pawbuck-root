import {
  meetsMinimumPlan,
  normalizePlan,
  resolveEffectiveSubscriptionPlan,
} from "@/constants/subscriptionPlans";

describe("normalizePlan", () => {
  it("maps legacy premium to individual", () => {
    expect(normalizePlan("premium")).toBe("individual");
  });

  it("defaults unknown values to free", () => {
    expect(normalizePlan(null)).toBe("free");
    expect(normalizePlan("unknown")).toBe("free");
  });
});

describe("meetsMinimumPlan", () => {
  it("ranks family above individual and free", () => {
    expect(meetsMinimumPlan("family", "individual")).toBe(true);
    expect(meetsMinimumPlan("family", "family")).toBe(true);
    expect(meetsMinimumPlan("individual", "family")).toBe(false);
    expect(meetsMinimumPlan("free", "individual")).toBe(false);
    expect(meetsMinimumPlan("free", "free")).toBe(true);
  });
});

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
