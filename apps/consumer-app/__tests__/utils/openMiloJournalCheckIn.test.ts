import {
  MILO_JOURNAL_CHECK_IN_START_MESSAGE,
  openMiloJournalCheckIn,
} from "@/utils/openMiloJournalCheckIn";

describe("openMiloJournalCheckIn", () => {
  it("navigates to Milo journal interview with auto-start flag", () => {
    const push = jest.fn();
    openMiloJournalCheckIn({ push } as any, "pet-123");

    expect(push).toHaveBeenCalledWith({
      pathname: "/(home)/milo",
      params: {
        pet: "pet-123",
        journalStart: "1",
      },
    });
  });

  it("passes optional journal domain", () => {
    const push = jest.fn();
    openMiloJournalCheckIn({ push } as any, "pet-123", { journalDomain: "behavioral" });

    expect(push).toHaveBeenCalledWith({
      pathname: "/(home)/milo",
      params: {
        pet: "pet-123",
        journalStart: "1",
        journalDomain: "behavioral",
      },
    });
  });

  it("uses a stable check-in starter message", () => {
    expect(MILO_JOURNAL_CHECK_IN_START_MESSAGE.length).toBeGreaterThan(10);
  });
});
