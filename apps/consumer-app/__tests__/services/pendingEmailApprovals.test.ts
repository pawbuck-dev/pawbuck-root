const mockUpdate = jest.fn();
const mockDelete = jest.fn();
const mockInvoke = jest.fn();

jest.mock("@/utils/supabase", () => ({
  supabase: {
    from: jest.fn((table: string) => {
      if (table === "pending_email_approvals") {
        return {
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              order: jest.fn().mockResolvedValue({ data: [], error: null }),
            }),
          }),
          update: mockUpdate,
          delete: mockDelete,
        };
      }
      throw new Error(`unexpected table ${table}`);
    }),
    functions: {
      invoke: (...args: unknown[]) => mockInvoke(...args),
    },
  },
}));

jest.mock("@/services/petEmailList", () => ({
  addEmail: jest.fn().mockResolvedValue({ id: 1 }),
}));

import { addEmail } from "@/services/petEmailList";
import {
  approveEmail,
  getPendingApprovals,
  rejectEmail,
  updateApprovalStatus,
} from "@/services/pendingEmailApprovals";

describe("pendingEmailApprovals", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUpdate.mockReturnValue({ eq: jest.fn().mockResolvedValue({ error: null }) });
    mockDelete.mockReturnValue({ eq: jest.fn().mockResolvedValue({ error: null }) });
    mockInvoke.mockResolvedValue({ data: { ok: true } });
  });

  it("getPendingApprovals returns array", async () => {
    const rows = await getPendingApprovals();
    expect(Array.isArray(rows)).toBe(true);
  });

  it("updateApprovalStatus updates row", async () => {
    await updateApprovalStatus("id-1", "approved");
    expect(mockUpdate).toHaveBeenCalledWith({ status: "approved" });
  });

  it("approveEmail whitelists and re-invokes edge", async () => {
    const result = await approveEmail("ap1", "pet1", "vet@clinic.com", "pending-emails", "key.json");
    expect(result.success).toBe(true);
    expect(addEmail).toHaveBeenCalledWith("pet1", "vet@clinic.com", false);
    expect(mockInvoke).toHaveBeenCalledWith(
      "mailgun-process-pet-mail",
      expect.objectContaining({ body: { bucket: "pending-emails", fileKey: "key.json" } })
    );
  });

  it("rejectEmail blocks sender", async () => {
    const result = await rejectEmail("ap1", "pet1", "spam@bad.com");
    expect(result.success).toBe(true);
    expect(addEmail).toHaveBeenCalledWith("pet1", "spam@bad.com", true);
  });
});
