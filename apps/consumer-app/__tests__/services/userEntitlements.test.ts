import { isActivePremium } from "@/services/userEntitlements";
import type { Tables } from "@/database.types";

type Row = Tables<"user_entitlements">;

describe("isActivePremium", () => {
  it("returns false for null or free", () => {
    expect(isActivePremium(null)).toBe(false);
    expect(
      isActivePremium({
        user_id: "u",
        plan: "free",
        subscription_status: null,
        expires_at: null,
        provider_customer_id: null,
        updated_at: new Date().toISOString(),
      } as Row)
    ).toBe(false);
  });

  it("returns true for premium without expiry", () => {
    expect(
      isActivePremium({
        user_id: "u",
        plan: "premium",
        subscription_status: "active",
        expires_at: null,
        provider_customer_id: null,
        updated_at: new Date().toISOString(),
      } as Row)
    ).toBe(true);
  });

  it("returns true when expiry is in the future", () => {
    const future = new Date(Date.now() + 864e5).toISOString();
    expect(
      isActivePremium({
        user_id: "u",
        plan: "premium",
        subscription_status: "active",
        expires_at: future,
        provider_customer_id: null,
        updated_at: new Date().toISOString(),
      } as Row)
    ).toBe(true);
  });

  it("returns false when expiry is in the past", () => {
    const past = new Date(Date.now() - 864e5).toISOString();
    expect(
      isActivePremium({
        user_id: "u",
        plan: "premium",
        subscription_status: "expired",
        expires_at: past,
        provider_customer_id: null,
        updated_at: new Date().toISOString(),
      } as Row)
    ).toBe(false);
  });
});
