import { resolveFeatureGateKey } from "@/constants/featureGates";

describe("resolveFeatureGateKey", () => {
  it("maps analytics aliases to canonical keys", () => {
    expect(resolveFeatureGateKey("milo_fab")).toBe("milo_chat");
    expect(resolveFeatureGateKey("weekly_challenge")).toBe("weekly_challenge");
    expect(resolveFeatureGateKey("pet_journal_home_row")).toBe("pet_journal");
    expect(resolveFeatureGateKey("family_access_invite")).toBe("family_sharing");
    expect(resolveFeatureGateKey("pet_transfer_create")).toBe("pet_transfer");
    expect(resolveFeatureGateKey("pet_transfer_accept")).toBe("pet_transfer");
  });

  it("returns undefined for unknown strings", () => {
    expect(resolveFeatureGateKey("unknown_analytics_tag")).toBeUndefined();
  });
});
