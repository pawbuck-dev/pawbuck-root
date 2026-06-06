import { getActivePlanFromRow, isActivePremium, isFoundingMember } from "@/services/userEntitlements";
import type { UserEntitlementRow } from "@/services/userEntitlements";

function row(partial: Partial<UserEntitlementRow> & { plan: string }): UserEntitlementRow {
  return {
    user_id: "u",
    subscription_status: null,
    expires_at: null,
    provider_customer_id: null,
    updated_at: new Date().toISOString(),
    ...partial,
  } as UserEntitlementRow;
}

describe("userEntitlements", () => {
  it("isActivePremium returns false for null or free", () => {
    expect(isActivePremium(null)).toBe(false);
    expect(isActivePremium(row({ plan: "free" }))).toBe(false);
  });

  it("isActivePremium returns true for individual, family, legacy premium", () => {
    expect(isActivePremium(row({ plan: "individual" }))).toBe(true);
    expect(isActivePremium(row({ plan: "family" }))).toBe(true);
    expect(isActivePremium(row({ plan: "premium" }))).toBe(true);
  });

  it("respects expiry unless founding member", () => {
    const past = new Date(Date.now() - 864e5).toISOString();
    expect(isActivePremium(row({ plan: "individual", expires_at: past }))).toBe(false);
    expect(
      isActivePremium(row({ plan: "individual", expires_at: past, is_founding_member: true }))
    ).toBe(true);
  });

  it("getActivePlanFromRow normalizes premium to individual", () => {
    expect(getActivePlanFromRow(row({ plan: "premium" }))).toBe("individual");
    expect(getActivePlanFromRow(row({ plan: "family" }))).toBe("family");
  });

  it("isFoundingMember reads flag", () => {
    expect(isFoundingMember(row({ plan: "individual", is_founding_member: true }))).toBe(true);
    expect(isFoundingMember(row({ plan: "individual" }))).toBe(false);
  });
});
