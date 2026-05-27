import { isLocalPhotoUri } from "@/utils/petPhotoUpload";

describe("isLocalPhotoUri", () => {
  it("detects device picker URIs", () => {
    expect(isLocalPhotoUri("file:///var/mobile/photo.jpg")).toBe(true);
    expect(isLocalPhotoUri("ph://asset-id")).toBe(true);
    expect(isLocalPhotoUri("content://media/external/images/1")).toBe(true);
  });

  it("returns false for Supabase storage paths", () => {
    expect(
      isLocalPhotoUri("u1/pet_Milo_abc123/profile.jpg"),
    ).toBe(false);
  });

  it("returns false for empty values", () => {
    expect(isLocalPhotoUri(null)).toBe(false);
    expect(isLocalPhotoUri("")).toBe(false);
  });
});
