import { isMonetizationEnabled } from "@/constants/monetization";

describe("isMonetizationEnabled", () => {
  const original = process.env.EXPO_PUBLIC_MONETIZATION_ENABLED;

  afterEach(() => {
    if (original === undefined) {
      delete process.env.EXPO_PUBLIC_MONETIZATION_ENABLED;
    } else {
      process.env.EXPO_PUBLIC_MONETIZATION_ENABLED = original;
    }
  });

  it("is false when unset", () => {
    delete process.env.EXPO_PUBLIC_MONETIZATION_ENABLED;
    expect(isMonetizationEnabled()).toBe(false);
  });

  it("is false when explicitly false", () => {
    process.env.EXPO_PUBLIC_MONETIZATION_ENABLED = "false";
    expect(isMonetizationEnabled()).toBe(false);
  });

  it("is true only for exact true", () => {
    process.env.EXPO_PUBLIC_MONETIZATION_ENABLED = "true";
    expect(isMonetizationEnabled()).toBe(true);
  });
});
