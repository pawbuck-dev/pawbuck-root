import moment from "moment";
import {
  computeWalkingStreakFromSessions,
  formatWeeklyChallengeFigmaLine,
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

describe("formatWeeklyChallengeFigmaLine", () => {
  it("returns empty-state copy with emoji", () => {
    expect(formatWeeklyChallengeFigmaLine(null, 0)).toBe("Be the first pet parent this week 👀");
  });

  it("formats ranked pet-parent copy", () => {
    expect(formatWeeklyChallengeFigmaLine(6, 247)).toBe("#6 of 247 pet parents are ahead of you 👀");
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
