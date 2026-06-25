import { resolveFeatureGateKey, fallbackMinimumPlanForFeature, FEATURE_GATE_KEYS } from "@/constants/featureGates";

describe("resolveFeatureGateKey", () => {
  it("maps analytics aliases to canonical keys", () => {
    expect(resolveFeatureGateKey("milo_fab")).toBe("milo_chat");
    expect(resolveFeatureGateKey("weekly_challenge")).toBe("weekly_challenge");
    expect(resolveFeatureGateKey("pet_journal_home_row")).toBe("pet_journal");
    expect(resolveFeatureGateKey("family_access_invite")).toBe("family_sharing");
    expect(resolveFeatureGateKey("pet_transfer_create")).toBe("pet_transfer");
    expect(resolveFeatureGateKey("pet_transfer_accept")).toBe("pet_transfer");
    expect(resolveFeatureGateKey("pet_email_setup")).toBe("per_pet_email");
  });

  it("returns undefined for unknown strings", () => {
    expect(resolveFeatureGateKey("unknown_analytics_tag")).toBeUndefined();
  });
});

describe("fallbackMinimumPlanForFeature", () => {
  it("defaults unknown keys to individual (fail-closed)", () => {
    expect(fallbackMinimumPlanForFeature("unknown_feature")).toBe("individual");
  });

  it("keeps free-tier taste features at free when API is down", () => {
    expect(fallbackMinimumPlanForFeature("milo_chat")).toBe("free");
    expect(fallbackMinimumPlanForFeature("pet_journal")).toBe("free");
  });

  it("covers every registered gate key", () => {
    for (const key of FEATURE_GATE_KEYS) {
      expect(fallbackMinimumPlanForFeature(key)).toBeDefined();
    }
  });
});
