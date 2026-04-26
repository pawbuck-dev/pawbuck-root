import { formatPetInboundEmail } from "@/utils/petEmail";

describe("formatPetInboundEmail", () => {
  it("uses email_id when provided", () => {
    expect(formatPetInboundEmail("fluffy_1", "Fluffy")).toBe("fluffy_1@pawbuck.app");
  });

  it("falls back to pet name slug when email_id missing", () => {
    expect(formatPetInboundEmail(null, "Sir Barks")).toBe("sirbarks@pawbuck.app");
  });
});
