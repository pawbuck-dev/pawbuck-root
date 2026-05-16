import type { User } from "@supabase/supabase-js";
import {
  miloHiGreetingSuffixFromUser,
  profileEmailDisplayForHero,
  resolveHomeCareHeadline,
  resolveProfileHeroDisplayName,
  sanitizeCareTeamMemberDisplayName,
} from "@/utils/userDisplayIdentity";

function mockUser(partial: Partial<User>): User {
  return partial as User;
}

describe("miloHiGreetingSuffixFromUser", () => {
  it("returns space + first name when full_name is set", () => {
    const u = mockUser({
      user_metadata: { full_name: "Ada Lovelace" },
    });
    expect(miloHiGreetingSuffixFromUser(u)).toBe(" Ada");
  });

  it("returns space + first name when only OIDC name is set", () => {
    const u = mockUser({
      user_metadata: { name: "Jordan Lee" },
    });
    expect(miloHiGreetingSuffixFromUser(u)).toBe(" Jordan");
  });

  it("returns ' there' when no usable name (no email local-part fallback)", () => {
    const u = mockUser({ email: "9wqhyq7fh6@privaterelay.appleid.com" });
    expect(miloHiGreetingSuffixFromUser(u)).toBe(" there");
  });

  it("returns ' there' when metadata full_name is an opaque handle", () => {
    const u = mockUser({
      user_metadata: { full_name: "9wqhyq7fh6" },
    });
    expect(miloHiGreetingSuffixFromUser(u)).toBe(" there");
  });
});

describe("resolveHomeCareHeadline", () => {
  it("uses owner first name when logged in with a display name", () => {
    const u = mockUser({ user_metadata: { full_name: "Rakesh Renganathan" } });
    expect(resolveHomeCareHeadline(u, { name: "Pawsome" })).toBe("Rakesh");
  });

  it("falls back to pet name when owner name is not available", () => {
    const u = mockUser({ email: "opaque@privaterelay.appleid.com" });
    expect(resolveHomeCareHeadline(u, { name: "Pawsome" })).toBe("Pawsome");
  });

  it("returns Home when neither owner nor pet name is available", () => {
    expect(resolveHomeCareHeadline(null, null)).toBe("Home");
  });
});

describe("resolveProfileHeroDisplayName", () => {
  it("prefers profile full name", () => {
    const u = mockUser({ user_metadata: { full_name: "Meta" } });
    expect(resolveProfileHeroDisplayName("Profile Name", u)).toEqual({
      displayName: "Profile Name",
      hideNameLockedBadge: false,
    });
  });

  it("falls back to Add your name without Locked when nothing set", () => {
    const u = mockUser({ email: "x@privaterelay.appleid.com" });
    expect(resolveProfileHeroDisplayName(undefined, u)).toEqual({
      displayName: "Add your name",
      hideNameLockedBadge: true,
    });
  });

  it("uses OIDC name from metadata when profile empty", () => {
    const u = mockUser({ user_metadata: { name: "Riley" } });
    expect(resolveProfileHeroDisplayName(undefined, u)).toEqual({
      displayName: "Riley",
      hideNameLockedBadge: false,
    });
  });

  it("ignores junk full_name in metadata", () => {
    const u = mockUser({ user_metadata: { full_name: "9wqhyq7fh6" } });
    expect(resolveProfileHeroDisplayName(undefined, u)).toEqual({
      displayName: "Add your name",
      hideNameLockedBadge: true,
    });
  });
});

describe("profileEmailDisplayForHero", () => {
  it("masks Apple relay with primary label and relay behind details", () => {
    expect(profileEmailDisplayForHero("ab@privaterelay.appleid.com")).toEqual({
      primary: "Email hidden via Apple Sign In",
      relayAddress: "ab@privaterelay.appleid.com",
    });
  });

  it("shows normal email inline", () => {
    expect(profileEmailDisplayForHero("hi@example.com")).toEqual({
      primary: "hi@example.com",
      relayAddress: null,
    });
  });
});

describe("sanitizeCareTeamMemberDisplayName", () => {
  it("replaces uh-style placeholders with role label", () => {
    expect(sanitizeCareTeamMemberDisplayName("Uhh", null, "Pet Sitter")).toBe("Pet Sitter");
    expect(sanitizeCareTeamMemberDisplayName(null, "uhh", "Pet Sitter")).toBe("Pet Sitter");
  });

  it("keeps real names", () => {
    expect(sanitizeCareTeamMemberDisplayName("Sam Sitter", null, "Pet Sitter")).toBe("Sam Sitter");
  });
});
