const mockGetUser = jest.fn();
const mockInvoke = jest.fn();

jest.mock("@/utils/supabase", () => ({
  supabase: {
    auth: { getUser: (...args: unknown[]) => mockGetUser(...args) },
    functions: { invoke: (...args: unknown[]) => mockInvoke(...args) },
  },
}));

import {
  acceptPetFamilyInviteToken,
  petFamilyInviteErrorMessage,
  resolveInviteTokenFromParams,
  sendPetFamilyInvite,
} from "@/services/petFamilyInvites";

describe("petFamilyInvites service", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetUser.mockResolvedValue({ data: { user: { id: "user-1" } } });
  });

  describe("sendPetFamilyInvite", () => {
    it("invokes send-family-invite edge function", async () => {
      mockInvoke.mockResolvedValue({ data: { ok: true, emailSent: true }, error: null });
      await sendPetFamilyInvite({
        petId: "pet-1",
        email: "Family@Example.com",
        role: "contributor",
      });
      expect(mockInvoke).toHaveBeenCalledWith("send-family-invite", {
        body: {
          petId: "pet-1",
          email: "family@example.com",
          role: "contributor",
        },
      });
    });
  });

  describe("acceptPetFamilyInviteToken", () => {
    it("invokes process-invite-token and returns pet + role", async () => {
      mockInvoke.mockResolvedValue({
        data: { ok: true, pet_id: "pet-1", role: "admin" },
        error: null,
      });
      const result = await acceptPetFamilyInviteToken(" tok ");
      expect(mockInvoke).toHaveBeenCalledWith("process-invite-token", {
        body: { token: "tok" },
      });
      expect(result).toEqual({ petId: "pet-1", role: "admin" });
    });

    it("maps email_mismatch error", async () => {
      mockInvoke.mockResolvedValue({
        data: { ok: false, error: "email_mismatch" },
        error: null,
      });
      await expect(acceptPetFamilyInviteToken("abc")).rejects.toThrow(
        petFamilyInviteErrorMessage("email_mismatch", "")
      );
    });
  });

  describe("resolveInviteTokenFromParams", () => {
    it("prefers inviteToken over token", () => {
      expect(
        resolveInviteTokenFromParams({ inviteToken: "a", token: "b" })
      ).toBe("a");
    });

    it("falls back to token query param from email links", () => {
      expect(resolveInviteTokenFromParams({ token: "email-link-token" })).toBe(
        "email-link-token"
      );
    });
  });
});
