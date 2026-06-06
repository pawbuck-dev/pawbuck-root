import {
  shouldShowStreakUpgradePrompt,
  streakUpgradeDismissKey,
} from "@/services/streakUpgradePrompt";

describe("streakUpgradePrompt", () => {
  it("uses per-user dismiss key", () => {
    expect(streakUpgradeDismissKey("user-1")).toContain("user-1");
  });

  it("shows for free users with streak >= 10", () => {
    expect(shouldShowStreakUpgradePrompt(10, "free", null)).toBe(true);
    expect(shouldShowStreakUpgradePrompt(15, "free", null)).toBe(true);
  });

  it("hides for paid plans or low streak", () => {
    expect(shouldShowStreakUpgradePrompt(10, "individual", null)).toBe(false);
    expect(shouldShowStreakUpgradePrompt(9, "free", null)).toBe(false);
  });

  it("respects dismiss-until timestamp", () => {
    const future = Date.now() + 60_000;
    expect(shouldShowStreakUpgradePrompt(12, "free", future)).toBe(false);
    expect(shouldShowStreakUpgradePrompt(12, "free", Date.now() - 1)).toBe(true);
  });
});
