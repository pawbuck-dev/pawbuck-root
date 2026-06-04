import { buildOwnerProfilePhotoPath } from "@/utils/ownerProfilePhotoUpload";

describe("ownerProfilePhotoUpload", () => {
  it("builds path under user id owner_profile folder", () => {
    expect(buildOwnerProfilePhotoPath("abc-123", "file:///photo.jpg")).toBe(
      "abc-123/owner_profile/avatar.jpg"
    );
  });
});
