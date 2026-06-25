import { formatRemindersProfileSubtitle } from "@/constants/remindersUi";

describe("formatRemindersProfileSubtitle", () => {
  it("summarizes journal time and push alerts", () => {
    expect(
      formatRemindersProfileSubtitle({
        journal_prompt_enabled: true,
        journal_prompt_hour: 20,
        document_expiry_push_enabled: true,
        vet_appointment_reminder_push_enabled: true,
      })
    ).toBe("Journal at 8 PM · Expiry & vet alerts on");
  });

  it("handles journal off and partial push toggles", () => {
    expect(
      formatRemindersProfileSubtitle({
        journal_prompt_enabled: false,
        document_expiry_push_enabled: false,
        vet_appointment_reminder_push_enabled: true,
      })
    ).toBe("Journal off · Vet alerts on");
  });
});
