let mockGetUser: jest.Mock;
let mockRpc: jest.Mock;
const mockInvitesFrom = {
  select: jest.fn(),
  insert: jest.fn(),
  update: jest.fn(),
};
const mockMembersFrom = { select: jest.fn() };

jest.mock("@/utils/supabase", () => {
  mockGetUser = jest.fn();
  mockRpc = jest.fn();
  return {
    supabase: {
      auth: { getUser: (...args: unknown[]) => mockGetUser(...args) },
      rpc: (...args: unknown[]) => mockRpc(...args),
      from: jest.fn((table: string) => {
        if (table === "household_invites") return mockInvitesFrom;
        if (table === "household_members") return mockMembersFrom;
        throw new Error(`unexpected table ${table}`);
      }),
    },
  };
});

import {
  createHouseholdInvite,
  deactivateInvite,
  getMyHouseholdInvites,
  getMyHouseholdMembers,
  removeHouseholdMember,
  useInviteCode,
  verifyInviteCode,
} from "@/services/householdInvites";

const USER = { id: "user-1" };
const INVITE_ROW = {
  id: "inv-1",
  code: "MTCH-2026-ABC123",
  created_by: USER.id,
  created_at: "2026-01-01T00:00:00Z",
  expires_at: "2026-12-31T00:00:00Z",
  used_at: null,
  used_by: null,
  is_active: true,
};

function mockAuth(user: { id: string } | null) {
  mockGetUser.mockResolvedValue({ data: { user } });
}

describe("householdInvites service", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockAuth(USER);
  });

  describe("verifyInviteCode", () => {
    it("returns null when invite not found", async () => {
      const single = jest.fn().mockResolvedValue({
        data: null,
        error: { code: "PGRST116" },
      });
      const eq2 = jest.fn().mockReturnValue({ single });
      const eq1 = jest.fn().mockReturnValue({ eq: eq2 });
      mockInvitesFrom.select = jest.fn().mockReturnValue({ eq: eq1 });

      await expect(verifyInviteCode("MTCH-2026-NOPE")).resolves.toBeNull();
      expect(eq1).toHaveBeenCalledWith("code", "MTCH-2026-NOPE");
      expect(eq2).toHaveBeenCalledWith("is_active", true);
    });

    it("returns null when invite is expired", async () => {
      const single = jest.fn().mockResolvedValue({
        data: {
          ...INVITE_ROW,
          expires_at: "2020-01-01T00:00:00Z",
        },
        error: null,
      });
      const eq2 = jest.fn().mockReturnValue({ single });
      const eq1 = jest.fn().mockReturnValue({ eq: eq2 });
      mockInvitesFrom.select = jest.fn().mockReturnValue({ eq: eq1 });

      await expect(verifyInviteCode("MTCH-2026-ABC123")).resolves.toBeNull();
    });

    it("returns null when invite was already used", async () => {
      const single = jest.fn().mockResolvedValue({
        data: {
          ...INVITE_ROW,
          used_at: "2026-02-01T00:00:00Z",
        },
        error: null,
      });
      const eq2 = jest.fn().mockReturnValue({ single });
      const eq1 = jest.fn().mockReturnValue({ eq: eq2 });
      mockInvitesFrom.select = jest.fn().mockReturnValue({ eq: eq1 });

      await expect(verifyInviteCode("MTCH-2026-ABC123")).resolves.toBeNull();
    });

    it("returns invite when valid", async () => {
      const single = jest.fn().mockResolvedValue({ data: INVITE_ROW, error: null });
      const eq2 = jest.fn().mockReturnValue({ single });
      const eq1 = jest.fn().mockReturnValue({ eq: eq2 });
      mockInvitesFrom.select = jest.fn().mockReturnValue({ eq: eq1 });

      await expect(verifyInviteCode(" mtch-2026-abc123 ")).resolves.toEqual(INVITE_ROW);
    });
  });

  describe("createHouseholdInvite", () => {
    it("requires authentication", async () => {
      mockAuth(null);
      await expect(createHouseholdInvite()).rejects.toThrow("User must be authenticated");
    });

    it("inserts MTCH code with expiry", async () => {
      const uniquenessSingle = jest
        .fn()
        .mockResolvedValue({ data: null, error: { code: "PGRST116" } });
      const uniquenessEq = jest.fn().mockReturnValue({ single: uniquenessSingle });
      const uniquenessSelect = jest.fn().mockReturnValue({ eq: uniquenessEq });

      const insertSingle = jest.fn().mockResolvedValue({ data: INVITE_ROW, error: null });
      const insertSelect = jest.fn().mockReturnValue({ single: insertSingle });
      const insert = jest.fn().mockReturnValue({ select: insertSelect });

      let selectCall = 0;
      mockInvitesFrom.select = jest.fn(() => {
        selectCall += 1;
        return selectCall === 1 ? { eq: uniquenessEq } : uniquenessSelect();
      });
      mockInvitesFrom.insert = insert;

      const row = await createHouseholdInvite(14);
      expect(row).toEqual(INVITE_ROW);
      expect(insert).toHaveBeenCalledWith(
        expect.objectContaining({
          created_by: USER.id,
          is_active: true,
          code: expect.stringMatching(/^MTCH-\d{4}-[A-Z0-9]{6}$/),
          expires_at: expect.any(String),
        })
      );
    });
  });

  describe("getMyHouseholdInvites", () => {
    it("lists invites for current user", async () => {
      const order = jest.fn().mockResolvedValue({ data: [INVITE_ROW], error: null });
      const eq = jest.fn().mockReturnValue({ order });
      mockInvitesFrom.select = jest.fn().mockReturnValue({ eq });

      await expect(getMyHouseholdInvites()).resolves.toEqual([INVITE_ROW]);
      expect(eq).toHaveBeenCalledWith("created_by", USER.id);
    });
  });

  describe("getMyHouseholdMembers", () => {
    it("lists active household members", async () => {
      const member = {
        id: "mem-1",
        user_id: "user-2",
        household_owner_id: USER.id,
        joined_at: "2026-01-01T00:00:00Z",
        is_active: true,
      };
      const order = jest.fn().mockResolvedValue({ data: [member], error: null });
      const eq2 = jest.fn().mockReturnValue({ order });
      const eq1 = jest.fn().mockReturnValue({ eq: eq2 });
      mockMembersFrom.select = jest.fn().mockReturnValue({ eq: eq1 });

      await expect(getMyHouseholdMembers()).resolves.toEqual([member]);
      expect(eq1).toHaveBeenCalledWith("household_owner_id", USER.id);
      expect(eq2).toHaveBeenCalledWith("is_active", true);
    });
  });

  describe("deactivateInvite", () => {
    it("deactivates invite owned by current user", async () => {
      const eq2 = jest.fn().mockResolvedValue({ error: null });
      const eq1 = jest.fn().mockReturnValue({ eq: eq2 });
      const update = jest.fn().mockReturnValue({ eq: eq1 });
      mockInvitesFrom.update = update;

      await deactivateInvite("inv-1");
      expect(update).toHaveBeenCalledWith({ is_active: false });
      expect(eq1).toHaveBeenCalledWith("id", "inv-1");
      expect(eq2).toHaveBeenCalledWith("created_by", USER.id);
    });
  });

  describe("useInviteCode", () => {
    it("requires authentication", async () => {
      mockAuth(null);
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

    it.each([
      ["invalid_code", "Invalid or expired invite code"],
      ["expired", "Invalid or expired invite code"],
      ["already_used", "This invite code has already been used"],
      ["self_join", "You cannot join your own household"],
      ["member_limit", "This household has reached the family member limit"],
    ] as const)("maps RPC error %s", async (code, message) => {
      mockRpc.mockResolvedValue({ data: { ok: false, error: code }, error: null });
      await expect(useInviteCode("CODE")).rejects.toThrow(message);
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

    it("maps not_found to user message", async () => {
      mockRpc.mockResolvedValue({ data: { ok: false, error: "not_found" }, error: null });
      await expect(removeHouseholdMember("missing")).rejects.toThrow("Member not found");
    });
  });
});
