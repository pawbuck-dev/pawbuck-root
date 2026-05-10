/**
 * Countries offered during pet onboarding (location for vaccine copy, etc.).
 * Keep in sync with flag lookups via {@link onboardingCountryFlags}.
 */
export type OnboardingCountryOption = {
  name: string;
  flag: string;
};

export const ONBOARDING_COUNTRY_OPTIONS: OnboardingCountryOption[] = [
  { name: "United States", flag: "🇺🇸" },
  { name: "Canada", flag: "🇨🇦" },
  { name: "United Kingdom", flag: "🇬🇧" },
  { name: "Germany", flag: "🇩🇪" },
  { name: "India", flag: "🇮🇳" },
  { name: "Australia", flag: "🇦🇺" },
  { name: "Ireland", flag: "🇮🇪" },
  { name: "New Zealand", flag: "🇳🇿" },
  { name: "Other", flag: "🌍" },
];

/** Map country display name → flag emoji for any UI that only has the name string. */
export function onboardingCountryFlags(): Record<string, string> {
  return Object.fromEntries(ONBOARDING_COUNTRY_OPTIONS.map((c) => [c.name, c.flag]));
}
