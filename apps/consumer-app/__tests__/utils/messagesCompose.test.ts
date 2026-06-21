import { isSupportComposeMode, supportComposeParams } from "@/utils/messagesCompose";
import { CONTACT_EMAIL } from "@/constants/contact";

describe("messagesCompose", () => {
  it("detects support compose mode", () => {
    expect(isSupportComposeMode("support")).toBe(true);
    expect(isSupportComposeMode("care_team")).toBe(false);
  });

  it("builds support route params for contact", () => {
    expect(supportComposeParams(CONTACT_EMAIL)).toEqual({
      email: CONTACT_EMAIL,
      composeMode: "support",
    });
  });
});
