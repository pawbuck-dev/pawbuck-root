import { REVENUECAT_PRO_ENTITLEMENT_ID } from "@/constants/revenuecat";
import { customerInfoHasPawbuckProEntitlement } from "@/utils/revenuecatEntitlement";

describe("customerInfoHasPawbuckProEntitlement", () => {
  it("returns true when Pawbuck Pro is active", () => {
    const ci = {
      entitlements: {
        active: { [REVENUECAT_PRO_ENTITLEMENT_ID]: {} },
      },
    };
    expect(customerInfoHasPawbuckProEntitlement(ci)).toBe(true);
  });

  it("returns false when entitlement is absent", () => {
    const ci = { entitlements: { active: {} } };
    expect(customerInfoHasPawbuckProEntitlement(ci)).toBe(false);
  });
});
