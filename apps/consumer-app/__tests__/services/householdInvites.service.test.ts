const mockGetUser = jest.fn();
const mockRpc = jest.fn();

jest.mock("@/utils/supabase", () => ({
  supabase: {
    auth: { getUser: (...args: unknown[]) => mockGetUser(...args) },
    rpc: (...args: unknown[]) => mockRpc(...args),
    from: jest.fn(),
  },
}));

import {
  removeHouseholdMember,
  useInviteCode,
} from "@/services/householdInvites";

describe("householdInvites service", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetUser.mockResolvedValue({ data: { user: { id: "user-1" } } });
  });

  describe("useInviteCode", () => {
    it("requires authentication", async () => {
      mockGetUser.mockResolvedValue({ data: { user: null } });
      await expect(useInviteCode("MTCH-2026-ABC")).rejects.toThrow(
        "User must be authenticated"
      );
    });

    it("calls accept_household_invite_code with trimmed uppercase code", async () => {
      mockRpc.mockResolvedValue({ data: { ok: true }, error: null });
      await useInviteCode(" mtch-2026-abc ");
      expect(mockRpc).toHaveBeenCalledWith("accept_household_invite_code", {
        p_code: "MTCH-2026-ABC",
      });
    });

    it("maps RPC error codes to user messages", async () => {
      mockRpc.mockResolvedValue({ data: { ok: false, error: "self_join" }, error: null });
      await expect(useInviteCode("CODE")).rejects.toThrow(
        "You cannot join your own household"
      );
    });

    it("throws on supabase rpc error", async () => {
      mockRpc.mockResolvedValue({ data: null, error: { message: "network" } });
      await expect(useInviteCode("CODE")).rejects.toThrow("network");
    });
  });

  describe("removeHouseholdMember", () => {
    it("calls revoke_household_member_access RPC", async () => {
      mockRpc.mockResolvedValue({ data: { ok: true }, error: null });
      await removeHouseholdMember("member-1");
      expect(mockRpc).toHaveBeenCalledWith("revoke_household_member_access", {
        p_member_id: "member-1",
      });
    });
  });
});
