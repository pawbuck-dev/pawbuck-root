import {
  formatLastWalkKicker,
  formatWalkDistanceDuration,
} from "@/utils/pawthonWalkDisplay";
import type { WalkSessionRow } from "@/services/walkSessions";
import moment from "moment";

describe("pawthonWalkDisplay", () => {
  it("formats last walk kicker for today", () => {
    const ended = moment().hour(14).minute(30).toISOString();
    const kicker = formatLastWalkKicker(ended);
    expect(kicker).toMatch(/^LAST WALK · Today/);
  });

  it("formats distance and duration", () => {
    const session = {
      distance_meters: 805,
      duration_seconds: 900,
    } as WalkSessionRow;
    expect(formatWalkDistanceDuration(session)).toMatch(/mi ·/);
  });
});
