import {
  peeNeedsObservationDetail,
  poopNeedsObservationDetail,
} from "@/constants/bodyTracker";

describe("bodyTracker observation helpers", () => {
  it("detects poop tags that need note/photo", () => {
    expect(poopNeedsObservationDetail([])).toBe(false);
    expect(poopNeedsObservationDetail(["Normal"])).toBe(false);
    expect(poopNeedsObservationDetail(["Mucus"])).toBe(true);
    expect(poopNeedsObservationDetail(["Blood"])).toBe(true);
    expect(poopNeedsObservationDetail(["Unusual color"])).toBe(true);
    expect(poopNeedsObservationDetail(["Soft", "Mucus"])).toBe(true);
  });

  it("detects pee tags that need note/photo", () => {
    expect(peeNeedsObservationDetail([])).toBe(false);
    expect(peeNeedsObservationDetail(["Normal"])).toBe(false);
    expect(peeNeedsObservationDetail(["Unusual color"])).toBe(true);
    expect(peeNeedsObservationDetail(["Frequent", "Unusual color"])).toBe(true);
  });
});
