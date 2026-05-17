import moment from "moment";
import {
  computeWalkingStreakFromSessions,
  formatWeeklyChallengeFigmaLine,
  isWeeklyChallengeEnabled,
  formatWeeklyWalkerRankLine,
} from "@/services/walkMetrics";

describe("formatWeeklyWalkerRankLine", () => {
  it("returns first-walker copy when total is 0", () => {
    expect(formatWeeklyWalkerRankLine(null, 0)).toBe("Be the first walker this week");
    expect(formatWeeklyWalkerRankLine(1, 0)).toBe("Be the first walker this week");
  });

  it("formats rank when present", () => {
    expect(formatWeeklyWalkerRankLine(3, 12)).toBe("#3 of 12 walkers");
  });

  it("handles unranked with positive total", () => {
    expect(formatWeeklyWalkerRankLine(null, 8)).toBe("8 walkers this week · start a walk to rank");
  });
});

describe("isWeeklyChallengeEnabled", () => {
  it("requires more than 300 registered users", () => {
    expect(isWeeklyChallengeEnabled(300)).toBe(false);
    expect(isWeeklyChallengeEnabled(301)).toBe(true);
  });
});

describe("formatWeeklyChallengeFigmaLine", () => {
  it("returns empty-state copy with emoji", () => {
    expect(formatWeeklyChallengeFigmaLine(null, 0)).toBe("Be the first pet parent this week 👀");
  });

  it("formats ranked pet-parent copy when cohort is large enough", () => {
    expect(formatWeeklyChallengeFigmaLine(6, 247)).toBe("#6 of 247 pet parents are ahead of you 👀");
    expect(formatWeeklyChallengeFigmaLine(1, 100)).toBe("#1 of 100 pet parents are ahead of you 👀");
  });

  it("uses non-rank copy when cohort is small to avoid misleading #1 of 1", () => {
    expect(formatWeeklyChallengeFigmaLine(1, 1)).toBe(
      "1 pet parent in your area this week · keep walking — rankings unlock when your local group grows 👀"
    );
    expect(formatWeeklyChallengeFigmaLine(6, 50)).toBe(
      "50 pet parents in your area this week · keep walking — rankings unlock when your local group grows 👀"
    );
  });

  it("uses unranked copy for large cohort without rank", () => {
    expect(formatWeeklyChallengeFigmaLine(null, 120)).toBe(
      "120 pet parents this week · start a walk to rank 👀"
    );
  });
});

describe("computeWalkingStreakFromSessions", () => {
  it("returns 0 for no sessions", () => {
    expect(computeWalkingStreakFromSessions([], 80)).toBe(0);
  });

  it("counts today when distance meets daily minimum", () => {
    const ended = moment().startOf("day").add(3, "hours").toISOString();
    expect(computeWalkingStreakFromSessions([{ ended_at: ended, distance_meters: 100 }], 80)).toBeGreaterThanOrEqual(
      1
    );
  });
});
