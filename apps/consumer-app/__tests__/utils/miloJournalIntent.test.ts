import {
  isDietLogText,
  isHydrationLogText,
  isRoutineJournalLogText,
} from "@/utils/miloJournalIntent";

describe("miloJournalIntent", () => {
  it("detects meal logging intent", () => {
    expect(isRoutineJournalLogText("Log 2 blows of food for milo")).toBe(true);
    expect(isDietLogText("Log 2 bowls of food for milo")).toBe(true);
  });

  it("detects water logging intent", () => {
    expect(isRoutineJournalLogText("Log 2 glasses of water")).toBe(true);
    expect(isHydrationLogText("Log 2 glasses of water")).toBe(true);
  });

  it("does not treat vomiting as routine log", () => {
    expect(isRoutineJournalLogText("Milo vomited twice today")).toBe(false);
  });
});
