import {
  emailParsingUpgradeAttachmentCount,
  isEmailParsingUpgradeReason,
  summarizeAttachmentFailureReason,
} from "@/services/failedEmails";

describe("failedEmails email parsing upgrade", () => {
  it("detects plan-skip failure reason prefix", () => {
    expect(isEmailParsingUpgradeReason("email_parsing_upgrade_required:3")).toBe(true);
    expect(isEmailParsingUpgradeReason("Failed to process")).toBe(false);
  });

  it("parses attachment count from reason", () => {
    expect(emailParsingUpgradeAttachmentCount("email_parsing_upgrade_required:2")).toBe(2);
  });

  it("summarizes upgrade reason for Review Inbox", () => {
    const summary = summarizeAttachmentFailureReason("email_parsing_upgrade_required:1");
    expect(summary).toMatch(/Individual/i);
    expect(summary).toMatch(/1/);
  });

  it("summarizes reprocess copy when parsing is allowed", () => {
    const summary = summarizeAttachmentFailureReason("email_parsing_upgrade_required:4", {
      canParseEmail: true,
    });
    expect(summary).toMatch(/reprocess/i);
    expect(summary).toMatch(/4/);
    expect(summary).not.toMatch(/Upgrade/i);
  });
});
