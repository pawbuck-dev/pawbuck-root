import {
  ONBOARDING_COUNTRY_OPTIONS,
  onboardingCountryFlags,
} from "@/constants/onboardingCountries";

describe("onboardingCountries", () => {
  it("includes expanded regions and Other", () => {
    const names = ONBOARDING_COUNTRY_OPTIONS.map((c) => c.name);
    expect(names).toEqual(
      expect.arrayContaining([
        "United States",
        "Canada",
        "United Kingdom",
        "Germany",
        "India",
        "Australia",
        "Ireland",
        "New Zealand",
        "Other",
      ])
    );
  });

  it("onboardingCountryFlags maps every option name", () => {
    const flags = onboardingCountryFlags();
    for (const { name, flag } of ONBOARDING_COUNTRY_OPTIONS) {
      expect(flags[name]).toBe(flag);
    }
  });
});
