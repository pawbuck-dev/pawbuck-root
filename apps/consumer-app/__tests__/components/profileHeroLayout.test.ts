import {
  PROFILE_HERO_AVATAR_DETAILS_GAP,
  PROFILE_HERO_DETAILS_OVERLAP,
  PROFILE_HERO_NAME_LABEL_GAP,
} from "@/components/profile/profileUiTokens";

describe("profile hero layout tokens (Option A — stacked)", () => {
  it("uses gap instead of negative overlap", () => {
    expect(PROFILE_HERO_DETAILS_OVERLAP).toBe(0);
    expect(PROFILE_HERO_AVATAR_DETAILS_GAP).toBeGreaterThanOrEqual(12);
  });

  it("uses tight label-to-value spacing", () => {
    expect(PROFILE_HERO_NAME_LABEL_GAP).toBeLessThanOrEqual(8);
  });
});
