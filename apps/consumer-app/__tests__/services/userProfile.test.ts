jest.mock("@/utils/ownerProfilePhotoUpload", () => ({
  uploadOwnerProfilePhotoFromUri: jest.fn().mockResolvedValue("user-1/owner_profile/avatar.jpg"),
}));

jest.mock("@/services/authDisplayName", () => ({
  persistOwnerDisplayNameForSession: jest.fn().mockResolvedValue(undefined),
}));

jest.mock("@/utils/supabase", () => ({
  supabase: {
    auth: {
      getUser: jest.fn(),
    },
    from: jest.fn(),
  },
}));

import { persistOwnerDisplayNameForSession } from "@/services/authDisplayName";
import { uploadOwnerProfilePhotoFromUri } from "@/utils/ownerProfilePhotoUpload";
import { updateUserProfile } from "@/services/userProfile";
import { supabase } from "@/utils/supabase";

const mockFrom = supabase.from as jest.Mock;
const mockGetUser = supabase.auth.getUser as jest.Mock;

describe("updateUserProfile", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetUser.mockResolvedValue({
      data: { user: { id: "user-1" } },
      error: null,
    });
  });

  function mockPreferencesExisting() {
    const singleExisting = jest.fn().mockResolvedValue({ data: { id: "pref-1" }, error: null });
    const updateEq = jest.fn().mockResolvedValue({ error: null });
    const update = jest.fn(() => ({ eq: updateEq }));
    mockFrom.mockImplementation((table: string) => {
      if (table !== "user_preferences") throw new Error(`unexpected table ${table}`);
      return {
        select: jest.fn(() => ({ eq: jest.fn(() => ({ single: singleExisting })) })),
        update,
        insert: jest.fn(),
      };
    });
  }

  it("persists full_name via persistOwnerDisplayNameForSession on iOS/Android/email flows", async () => {
    mockPreferencesExisting();
    await updateUserProfile({
      full_name: "Ada Lovelace",
      phone: "+16045551234",
      address: "Vancouver, BC",
    });
    expect(persistOwnerDisplayNameForSession).toHaveBeenCalledWith("Ada Lovelace");
  });

  it("updates phone and address without name when full_name omitted", async () => {
    mockPreferencesExisting();
    await updateUserProfile({ phone: "555", address: "BC" });
    expect(persistOwnerDisplayNameForSession).not.toHaveBeenCalled();
  });

  it("rejects empty full_name", async () => {
    await expect(updateUserProfile({ full_name: "   " })).rejects.toThrow("Name is required");
    expect(persistOwnerDisplayNameForSession).not.toHaveBeenCalled();
  });

  it("uploads profile photo when new_profile_photo_uri provided", async () => {
    mockPreferencesExisting();
    await updateUserProfile({ new_profile_photo_uri: "file:///photo.jpg" });
    expect(uploadOwnerProfilePhotoFromUri).toHaveBeenCalledWith("file:///photo.jpg", "user-1");
  });

  it("clears profile photo when clear_profile_photo is true", async () => {
    const updateEq = jest.fn().mockResolvedValue({ error: null });
    const update = jest.fn(() => ({ eq: updateEq }));
    mockFrom.mockImplementation(() => ({
      select: jest.fn(() => ({
        eq: jest.fn(() => ({
          single: jest.fn().mockResolvedValue({ data: { id: "pref-1" }, error: null }),
        })),
      })),
      update,
      insert: jest.fn(),
    }));
    await updateUserProfile({ clear_profile_photo: true, phone: null, address: null });
    expect(update).toHaveBeenCalledWith(
      expect.objectContaining({ profile_photo_path: null })
    );
  });
});
