import { evaluateNewBadges } from "@/services/pawthonBadges";
import type { WalkSessionRow } from "@/services/walkSessions";

describe("pawthonBadges", () => {
  it("unlocks first_walk on first session", () => {
    const session: WalkSessionRow = {
      id: "1",
      user_id: "u1",
      pet_id: "p1",
      started_at: new Date().toISOString(),
      ended_at: new Date().toISOString(),
      distance_meters: 100,
      duration_seconds: 600,
      points: null,
      created_at: new Date().toISOString(),
    };
    const newly = evaluateNewBadges({
      userId: "u1",
      petId: "p1",
      allSessions: [session],
      streakSessions: [{ ended_at: session.ended_at, distance_meters: 100 }],
      weekSessionsByPet: new Map([["p1", [session]]]),
      hasVerificationPhoto: false,
      weeklyRank: null,
      goalMeters: 805,
      previousEarned: {},
    });
    expect(newly).toContain("first_walk");
  });
});
