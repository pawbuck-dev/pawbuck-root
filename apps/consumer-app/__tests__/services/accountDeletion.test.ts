import {
  DELETE_ACCOUNT_FUNCTION_NAME,
  cancelAccountDeletion,
  getAccountDeletionStatus,
  invokeDeleteAccount,
} from "@/services/accountDeletion";

describe("account deletion service", () => {
  it("invokeDeleteAccount schedules via edge function", async () => {
    const invoke = jest.fn().mockResolvedValue({
      data: { purge_after: "2026-06-21T00:00:00Z" },
      error: null,
    });
    const result = await invokeDeleteAccount({ functions: { invoke } } as never);

    expect(invoke).toHaveBeenCalledWith(DELETE_ACCOUNT_FUNCTION_NAME, {
      body: { action: "schedule" },
    });
    expect(result.error).toBeNull();
    expect(result.purgeAfter).toBe("2026-06-21T00:00:00Z");
  });

  it("invokeDeleteAccount returns Error when Supabase returns error", async () => {
    const invoke = jest.fn().mockResolvedValue({
      data: null,
      error: { message: "edge failed" },
    });
    const result = await invokeDeleteAccount({ functions: { invoke } } as never);

    expect(result.error).toBeInstanceOf(Error);
    expect(result.error?.message).toBe("edge failed");
  });

  it("cancelAccountDeletion invokes cancel action", async () => {
    const invoke = jest.fn().mockResolvedValue({ data: { cancelled: true }, error: null });
    const result = await cancelAccountDeletion({ functions: { invoke } } as never);

    expect(invoke).toHaveBeenCalledWith(DELETE_ACCOUNT_FUNCTION_NAME, {
      body: { action: "cancel" },
    });
    expect(result.cancelled).toBe(true);
  });

  it("getAccountDeletionStatus maps RPC response", async () => {
    const rpc = jest.fn().mockResolvedValue({
      data: { scheduled: true, purge_after: "2026-06-21T00:00:00Z" },
      error: null,
    });
    const result = await getAccountDeletionStatus({ rpc } as never);

    expect(rpc).toHaveBeenCalledWith("get_account_deletion_status");
    expect(result.data?.scheduled).toBe(true);
    expect(result.data?.purge_after).toBe("2026-06-21T00:00:00Z");
  });
});
