import { APPROVED_PET_EMAIL_UI, FAMILY_SHARING_TITLE } from "@/constants/approvedPetEmailUi";

describe("APPROVED_PET_EMAIL_UI", () => {
  it("uses plain-language labels instead of safe senders jargon", () => {
    expect(APPROVED_PET_EMAIL_UI.sectionTitle).toBe("Trusted Contacts");
    expect(APPROVED_PET_EMAIL_UI.markApprovedAction).toBe("Always allow this email");
    expect(APPROVED_PET_EMAIL_UI.duplicateError).toMatch(/trusted contacts/i);
  });

  it("formats section subtitle by count", () => {
    expect(APPROVED_PET_EMAIL_UI.sectionSubtitle(0)).toBe(
      "People you trust to communicate and share records."
    );
    expect(APPROVED_PET_EMAIL_UI.sectionSubtitle(1)).toBe(
      "People you trust to communicate and share records."
    );
    expect(APPROVED_PET_EMAIL_UI.sectionSubtitle(3)).toBe(
      "People you trust to communicate and share records."
    );
  });
});

describe("FAMILY_SHARING_TITLE", () => {
  it("uses Family Sharing label", () => {
    expect(FAMILY_SHARING_TITLE).toBe("Family Sharing");
  });
});
