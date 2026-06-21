import { resolveProfileEditPhotoPreview } from "@/utils/profilePhotoPreview";

describe("resolveProfileEditPhotoPreview", () => {
  it("prefers pending over stored and oauth", () => {
    expect(
      resolveProfileEditPhotoPreview({
        pendingPhotoUri: "file://pending",
        storedPhotoPreviewUri: "https://stored",
        oauthAvatarUrl: "https://google",
        showOAuthAvatar: true,
      })
    ).toBe("file://pending");
  });

  it("falls back to stored when no pending", () => {
    expect(
      resolveProfileEditPhotoPreview({
        storedPhotoPreviewUri: "https://stored",
        oauthAvatarUrl: "https://google",
        showOAuthAvatar: true,
      })
    ).toBe("https://stored");
  });

  it("falls back to OAuth avatar when no uploaded photo", () => {
    expect(
      resolveProfileEditPhotoPreview({
        oauthAvatarUrl: "https://lh3.googleusercontent.com/photo",
        showOAuthAvatar: true,
      })
    ).toBe("https://lh3.googleusercontent.com/photo");
  });

  it("returns null when no sources", () => {
    expect(resolveProfileEditPhotoPreview({})).toBeNull();
    expect(
      resolveProfileEditPhotoPreview({
        oauthAvatarUrl: "https://google",
        showOAuthAvatar: false,
      })
    ).toBeNull();
  });
});
