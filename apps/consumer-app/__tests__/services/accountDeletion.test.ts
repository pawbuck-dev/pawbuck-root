import { DELETE_ACCOUNT_FUNCTION_NAME, invokeDeleteAccount } from "@/services/accountDeletion";

describe("invokeDeleteAccount", () => {
  it("invokes the delete-account edge function", async () => {
    const invoke = jest.fn().mockResolvedValue({ data: {}, error: null });
    const result = await invokeDeleteAccount({ functions: { invoke } } as never);

    expect(invoke).toHaveBeenCalledWith(DELETE_ACCOUNT_FUNCTION_NAME);
    expect(result.error).toBeNull();
  });

  it("returns Error when Supabase returns error", async () => {
    const invoke = jest.fn().mockResolvedValue({
      data: null,
      error: { message: "edge failed" },
    });
    const result = await invokeDeleteAccount({ functions: { invoke } } as never);

    expect(result.error).toBeInstanceOf(Error);
    expect(result.error?.message).toBe("edge failed");
  });
});
