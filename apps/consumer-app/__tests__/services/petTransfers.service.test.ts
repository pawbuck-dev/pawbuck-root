let mockGetUser: jest.Mock;
let mockRpc: jest.Mock;
const mockPetsFrom = { select: jest.fn(), insert: jest.fn(), update: jest.fn() };
const mockTransfersFrom = { select: jest.fn(), insert: jest.fn(), update: jest.fn() };
const mockMedicinesFrom = { select: jest.fn() };
const mockExamsFrom = { select: jest.fn() };

jest.mock("@/utils/supabase", () => {
  mockGetUser = jest.fn();
  mockRpc = jest.fn();
  return {
    supabase: {
      auth: { getUser: (...a: unknown[]) => mockGetUser(...a) },
      rpc: (...a: unknown[]) => mockRpc(...a),
      from: jest.fn((table: string) => {
        if (table === "pets") return mockPetsFrom;
        if (table === "pet_transfers") return mockTransfersFrom;
        if (table === "medicines") return mockMedicinesFrom;
        if (table === "clinical_exams") return mockExamsFrom;
        throw new Error(`unexpected table ${table}`);
      }),
    },
  };
});

import {
  cancelPetTransfer,
  createPetTransfer,
  declinePetTransfer,
  getMyPetTransfers,
  getPetTransferHistory,
  getTransferPrepSnapshot,
  useTransferCode,
  verifyTransferCode,
} from "@/services/petTransfers";

const USER = { id: "user-owner" };
const PET = { id: "pet-1", name: "Awesome", user_id: USER.id };

function mockAuth(user: { id: string } | null) {
  mockGetUser.mockResolvedValue({ data: { user } });
}

/** pets.select().eq().eq().single() */
function mockPetOwned(result: { data: typeof PET | null; error: Error | null }) {
  const single = jest.fn().mockResolvedValue(result);
  const eq2 = jest.fn().mockReturnValue({ single });
  const eq1 = jest.fn().mockReturnValue({ eq: eq2 });
  const select = jest.fn().mockReturnValue({ eq: eq1 });
  mockPetsFrom.select = select;
  return { select, eq1, eq2, single };
}

/** Active-transfer check then code-uniqueness check (createPetTransfer order). */
function setupTransferSelectForCreate() {
  const activeSingle = jest.fn().mockResolvedValue({ data: null, error: { code: "PGRST116" } });
  const activeIs = jest.fn().mockReturnValue({ single: activeSingle });
  const activeEq3 = jest.fn().mockReturnValue({ is: activeIs });
  const activeEq2 = jest.fn().mockReturnValue({ eq: activeEq3 });
  const activeEq1 = jest.fn().mockReturnValue({ eq: activeEq2 });

  const codeSingle = jest.fn().mockResolvedValue({ data: null, error: { code: "PGRST116" } });
  const codeEq = jest.fn().mockReturnValue({ single: codeSingle });

  let call = 0;
  mockTransfersFrom.select = jest.fn(() => {
    call += 1;
    if (call === 1) return { eq: activeEq1 };
    return { eq: codeEq };
  });
}

/** pet_transfers.insert().select().single() */
function mockInsertTransfer(row: Record<string, unknown>) {
  const single = jest.fn().mockResolvedValue({ data: row, error: null });
  const select = jest.fn().mockReturnValue({ single });
  const insert = jest.fn().mockReturnValue({ select });
  mockTransfersFrom.insert = insert;
  return { insert, select, single };
}

describe("petTransfers service", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("createPetTransfer", () => {
    it("throws when not authenticated", async () => {
      mockAuth(null);
      await expect(createPetTransfer("pet-1")).rejects.toThrow("User must be authenticated");
    });

    it("throws when pet not owned", async () => {
      mockAuth(USER);
      mockPetOwned({ data: null, error: new Error("not found") });
      await expect(createPetTransfer(PET.id)).rejects.toThrow(
        "Pet not found or you don't have permission"
      );
    });

    it("throws when an active transfer already exists", async () => {
      mockAuth(USER);
      mockPetOwned({ data: PET, error: null });
      const single = jest.fn().mockResolvedValue({ data: { id: "xfer-1" }, error: null });
      const isFilter = jest.fn().mockReturnValue({ single });
      const eq3 = jest.fn().mockReturnValue({ is: isFilter });
      const eq2 = jest.fn().mockReturnValue({ eq: eq3 });
      const eq1 = jest.fn().mockReturnValue({ eq: eq2 });
      mockTransfersFrom.select = jest.fn().mockReturnValue({ eq: eq1 });
      await expect(createPetTransfer(PET.id)).rejects.toThrow("active transfer already exists");
    });

    it("throws when journal entry is both highlighted and excluded", async () => {
      mockAuth(USER);
      mockPetOwned({ data: PET, error: null });
      setupTransferSelectForCreate();
      await expect(
        createPetTransfer(PET.id, {
          journalHighlightEntryIds: ["j1"],
          excludedJournalEntryIds: ["j1"],
        })
      ).rejects.toThrow("cannot be both highlighted and excluded");
    });

    it("creates transfer with 14-day expiry and journal options", async () => {
      mockAuth(USER);
      mockPetOwned({ data: PET, error: null });
      setupTransferSelectForCreate();
      const created = {
        id: "xfer-new",
        code: "TRF-AWES-2026-ABCD",
        pet_id: PET.id,
        from_user_id: USER.id,
        is_active: true,
        journal_highlight_entry_ids: ["j1"],
        excluded_journal_entry_ids: [],
      };
      const { insert } = mockInsertTransfer(created);

      const out = await createPetTransfer(PET.id, {
        expiresInDays: 14,
        transferReason: "rehoming",
        recipientContact: " new@example.com ",
        priorOwnerShowName: false,
        journalHighlightEntryIds: ["j1", "j2", "j3", "j4", "j5", "j6"],
      });

      expect(out.code).toMatch(/^TRF-/);
      expect(insert).toHaveBeenCalledWith(
        expect.objectContaining({
          pet_id: PET.id,
          from_user_id: USER.id,
          is_active: true,
          transfer_reason: "rehoming",
          recipient_contact: "new@example.com",
          prior_owner_show_name: false,
          journal_highlight_entry_ids: ["j1", "j2", "j3", "j4", "j5"],
        })
      );
    });
  });

  describe("verifyTransferCode", () => {
    it("returns null for PGRST116 (not found)", async () => {
      const single = jest.fn().mockResolvedValue({ data: null, error: { code: "PGRST116" } });
      const eq2 = jest.fn().mockReturnValue({ single });
      const eq1 = jest.fn().mockReturnValue({ eq: eq2 });
      mockTransfersFrom.select = jest.fn().mockReturnValue({ eq: eq1 });

      await expect(verifyTransferCode(" trf-x ")).resolves.toBeNull();
      expect(eq1).toHaveBeenCalledWith("code", "TRF-X");
    });

    it("returns null when expired", async () => {
      const single = jest.fn().mockResolvedValue({
        data: {
          id: "t1",
          code: "TRF-X",
          expires_at: new Date(Date.now() - 86400000).toISOString(),
          used_at: null,
          is_active: true,
          pets: { name: "Bo" },
        },
        error: null,
      });
      const eq2 = jest.fn().mockReturnValue({ single });
      const eq1 = jest.fn().mockReturnValue({ eq: eq2 });
      mockTransfersFrom.select = jest.fn().mockReturnValue({ eq: eq1 });

      await expect(verifyTransferCode("TRF-X")).resolves.toBeNull();
    });

    it("returns null when already used", async () => {
      const single = jest.fn().mockResolvedValue({
        data: {
          id: "t1",
          code: "TRF-X",
          expires_at: new Date(Date.now() + 86400000).toISOString(),
          used_at: new Date().toISOString(),
          is_active: true,
          pets: { name: "Bo" },
        },
        error: null,
      });
      const eq2 = jest.fn().mockReturnValue({ single });
      const eq1 = jest.fn().mockReturnValue({ eq: eq2 });
      mockTransfersFrom.select = jest.fn().mockReturnValue({ eq: eq1 });

      await expect(verifyTransferCode("TRF-X")).resolves.toBeNull();
    });

    it("returns transfer when valid", async () => {
      const row = {
        id: "t1",
        code: "TRF-OK",
        expires_at: new Date(Date.now() + 86400000).toISOString(),
        used_at: null,
        is_active: true,
        pets: { name: "Bo", breed: null },
      };
      const single = jest.fn().mockResolvedValue({ data: row, error: null });
      const eq2 = jest.fn().mockReturnValue({ single });
      const eq1 = jest.fn().mockReturnValue({ eq: eq2 });
      mockTransfersFrom.select = jest.fn().mockReturnValue({ eq: eq1 });

      const out = await verifyTransferCode("trf-ok");
      expect(out?.code).toBe("TRF-OK");
      expect((out as { pets?: { name: string } }).pets?.name).toBe("Bo");
    });
  });

  describe("declinePetTransfer", () => {
    it("throws when not authenticated", async () => {
      mockAuth(null);
      await expect(declinePetTransfer("CODE")).rejects.toThrow("User must be authenticated");
    });

    it("calls decline_pet_transfer RPC with uppercase code", async () => {
      mockAuth(USER);
      mockRpc.mockResolvedValue({ data: "xfer-id", error: null });
      await declinePetTransfer("  abc  ");
      expect(mockRpc).toHaveBeenCalledWith("decline_pet_transfer", { p_code: "ABC" });
    });

    it("throws friendly message on RPC error", async () => {
      mockAuth(USER);
      mockRpc.mockResolvedValue({ data: null, error: { message: "Invalid code" } });
      await expect(declinePetTransfer("X")).rejects.toThrow("Invalid code");
    });
  });

  describe("useTransferCode", () => {
    it("throws when not authenticated", async () => {
      mockAuth(null);
      await expect(useTransferCode("CODE")).rejects.toThrow("User must be authenticated");
    });

    it("calls accept_pet_transfer RPC with display name", async () => {
      mockAuth(USER);
      mockRpc.mockResolvedValue({ data: PET.id, error: null });
      await useTransferCode(" trf-1 ", "Jamie");
      expect(mockRpc).toHaveBeenCalledWith("accept_pet_transfer", {
        p_code: "TRF-1",
        p_pet_parent_display_name: "Jamie",
      });
    });
  });

  describe("getMyPetTransfers", () => {
    it("throws when not authenticated", async () => {
      mockAuth(null);
      await expect(getMyPetTransfers()).rejects.toThrow("User must be authenticated");
    });

    it("returns transfers for current user", async () => {
      mockAuth(USER);
      const order = jest.fn().mockResolvedValue({ data: [{ id: "t1" }], error: null });
      const eq = jest.fn().mockReturnValue({ order });
      mockTransfersFrom.select = jest.fn().mockReturnValue({ eq });
      const rows = await getMyPetTransfers();
      expect(rows).toHaveLength(1);
      expect(eq).toHaveBeenCalledWith("from_user_id", USER.id);
    });
  });

  describe("cancelPetTransfer", () => {
    it("throws when not authenticated", async () => {
      mockAuth(null);
      await expect(cancelPetTransfer("xfer-1")).rejects.toThrow("User must be authenticated");
    });

    it("deactivates transfer for owner only", async () => {
      mockAuth(USER);
      const eq2 = jest.fn().mockResolvedValue({ error: null });
      const eq1 = jest.fn().mockReturnValue({ eq: eq2 });
      const update = jest.fn().mockReturnValue({ eq: eq1 });
      mockTransfersFrom.update = update;

      await cancelPetTransfer("xfer-1");
      expect(update).toHaveBeenCalledWith({ is_active: false });
      expect(eq1).toHaveBeenCalledWith("id", "xfer-1");
      expect(eq2).toHaveBeenCalledWith("from_user_id", USER.id);
    });
  });

  describe("getTransferPrepSnapshot", () => {
    it("computes active meds and vet visit age", async () => {
      mockAuth(USER);
      mockPetOwned({
        data: { id: PET.id, weight_value: 12, weight_unit: "kg" },
        error: null,
      });

      mockMedicinesFrom.select = jest.fn().mockReturnValue({
        eq: jest.fn().mockResolvedValue({
          data: [
            { id: "m1", end_date: null },
            { id: "m2", end_date: "1999-01-01" },
            { id: "m3", end_date: "2099-01-01" },
          ],
          error: null,
        }),
      });

      const oldExam = new Date();
      oldExam.setFullYear(oldExam.getFullYear() - 2);
      const examDate = oldExam.toISOString().slice(0, 10);
      const limit = jest.fn().mockResolvedValue({ data: [{ exam_date: examDate }], error: null });
      const order = jest.fn().mockReturnValue({ limit });
      const eq = jest.fn().mockReturnValue({ order });
      mockExamsFrom.select = jest.fn().mockReturnValue({ eq });

      const snap = await getTransferPrepSnapshot(PET.id);
      expect(snap.weightLabel).toBe("12 kg");
      expect(snap.activeMedicationCount).toBe(2);
      expect(snap.vetVisitOlderThan12Months).toBe(true);
      expect(snap.lastVetVisitDate).toBe(examDate);
    });
  });

  describe("getPetTransferHistory", () => {
    it("returns completed transfers ordered by used_at", async () => {
      const order = jest.fn().mockResolvedValue({
        data: [{ id: "h1", used_at: "2026-01-01" }],
        error: null,
      });
      const not = jest.fn().mockReturnValue({ order });
      const eq = jest.fn().mockReturnValue({ not });
      mockTransfersFrom.select = jest.fn().mockReturnValue({ eq });

      const rows = await getPetTransferHistory(PET.id);
      expect(rows).toHaveLength(1);
      expect(eq).toHaveBeenCalledWith("pet_id", PET.id);
      expect(not).toHaveBeenCalledWith("used_at", "is", null);
    });
  });
});
