/**
 * Manual QA (device): Apple first sign-in with name shared; Apple repeat sign-in (no fullName);
 * Google sign-in; kill app mid-onboarding and confirm pet draft restores; OAuth from review when
 * Apple withholds name → post-auth confirm with optional “What should we call you?” inline field.
 */
import {
  extractGoogleDisplayName,
  formatAppleFullName,
  isPlausibleDisplayNameForGreeting,
  needsDisplayNamePrompt,
  resolveAuthDisplayName,
} from "@/services/authDisplayName";
import type { User } from "@supabase/supabase-js";

describe("formatAppleFullName", () => {
  it("returns empty for null", () => {
    expect(formatAppleFullName(null)).toBe("");
  });

  it("joins given and family", () => {
    expect(
      formatAppleFullName({
        namePrefix: null,
        givenName: "Ada",
        middleName: null,
        familyName: "Lovelace",
        nameSuffix: null,
        nickname: null,
      })
    ).toBe("Ada Lovelace");
  });

  it("handles given only", () => {
    expect(
      formatAppleFullName({
        namePrefix: null,
        givenName: "Jordan",
        middleName: null,
        familyName: null,
        nameSuffix: null,
        nickname: null,
      })
    ).toBe("Jordan");
  });
});

describe("extractGoogleDisplayName", () => {
  it("prefers name", () => {
    expect(extractGoogleDisplayName({ name: "Pat Smith", givenName: "P", familyName: "S" })).toBe(
      "Pat Smith"
    );
  });

  it("falls back to given and family", () => {
    expect(extractGoogleDisplayName({ name: null, givenName: "Sam", familyName: "Lee" })).toBe(
      "Sam Lee"
    );
  });
});

describe("resolveAuthDisplayName", () => {
  it("prefers full_name over name", () => {
    expect(
      resolveAuthDisplayName({
        user_metadata: { full_name: "Full", name: "Nick" },
      } as User)
    ).toBe("Full");
  });

  it("uses name when full_name empty", () => {
    expect(resolveAuthDisplayName({ user_metadata: { name: "Taylor" } } as User)).toBe("Taylor");
  });
});

describe("isPlausibleDisplayNameForGreeting", () => {
  it("accepts normal names", () => {
    expect(isPlausibleDisplayNameForGreeting("Ada")).toBe(true);
    expect(isPlausibleDisplayNameForGreeting("Mary Jane")).toBe(true);
  });

  it("rejects opaque mixed alnum handles", () => {
    expect(isPlausibleDisplayNameForGreeting("9wqhyq7fh6")).toBe(false);
  });

  it("rejects empty", () => {
    expect(isPlausibleDisplayNameForGreeting("")).toBe(false);
    expect(isPlausibleDisplayNameForGreeting("   ")).toBe(false);
  });
});

describe("needsDisplayNamePrompt", () => {
  it("true when full_name missing", () => {
    expect(needsDisplayNamePrompt({ user_metadata: {} } as User)).toBe(true);
  });

  it("false when full_name set", () => {
    expect(
      needsDisplayNamePrompt({ user_metadata: { full_name: "Ada" } } as User)
    ).toBe(false);
  });

  it("true for blank full_name", () => {
    expect(needsDisplayNamePrompt({ user_metadata: { full_name: "   " } } as User)).toBe(true);
  });

  it("false when only OIDC name is set and plausible", () => {
    expect(needsDisplayNamePrompt({ user_metadata: { name: "Pat Smith" } } as User)).toBe(false);
  });

  it("true when full_name is junk handle", () => {
    expect(
      needsDisplayNamePrompt({ user_metadata: { full_name: "9wqhyq7fh6" } } as User)
    ).toBe(true);
  });
});
