import {
  createSessionFromAuthUrl,
  getPasswordResetRedirectUrl,
  parseAuthTokensFromUrl,
  requestPasswordReset,
  updatePassword,
  userHasEmailPasswordIdentity,
} from "@/services/authPasswordReset";
import { supabase } from "@/utils/supabase";
import type { User } from "@supabase/supabase-js";

jest.mock("@/utils/supabase", () => ({
  supabase: {
    auth: {
      resetPasswordForEmail: jest.fn(),
      setSession: jest.fn(),
      updateUser: jest.fn(),
    },
  },
}));

describe("authPasswordReset", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("builds HTTPS redirect URL on pawbuck.app", () => {
    expect(getPasswordResetRedirectUrl()).toBe("https://pawbuck.app/reset-password");
  });

  it("parses tokens from hash fragment", () => {
    const parsed = parseAuthTokensFromUrl(
      "https://pawbuck.app/reset-password#access_token=abc&refresh_token=def&type=recovery"
    );
    expect(parsed.accessToken).toBe("abc");
    expect(parsed.refreshToken).toBe("def");
    expect(parsed.error).toBeNull();
  });

  it("parses error from query string", () => {
    const parsed = parseAuthTokensFromUrl(
      "pawbuck:///reset-password?error=access_denied&error_description=Expired"
    );
    expect(parsed.error).toBe("access_denied");
    expect(parsed.errorDescription).toBe("Expired");
  });

  it("requestPasswordReset calls Supabase with redirect URL", async () => {
    (supabase.auth.resetPasswordForEmail as jest.Mock).mockResolvedValue({ error: null });

    const result = await requestPasswordReset("  user@test.com  ");

    expect(supabase.auth.resetPasswordForEmail).toHaveBeenCalledWith("user@test.com", {
      redirectTo: "https://pawbuck.app/reset-password",
    });
    expect(result.message).toMatch(/If an account exists/);
  });

  it("createSessionFromAuthUrl sets session from parsed tokens", async () => {
    (supabase.auth.setSession as jest.Mock).mockResolvedValue({ error: null });

    await createSessionFromAuthUrl(
      "pawbuck:///reset-password#access_token=at&refresh_token=rt"
    );

    expect(supabase.auth.setSession).toHaveBeenCalledWith({
      access_token: "at",
      refresh_token: "rt",
    });
  });

  it("createSessionFromAuthUrl throws on missing tokens", async () => {
    await expect(createSessionFromAuthUrl("pawbuck:///reset-password")).rejects.toThrow(
      "invalid or has expired"
    );
  });

  it("updatePassword rejects short passwords", async () => {
    await expect(updatePassword("12345")).rejects.toThrow("at least 6");
  });

  it("updatePassword calls Supabase updateUser", async () => {
    (supabase.auth.updateUser as jest.Mock).mockResolvedValue({ error: null });

    await updatePassword("secret123");

    expect(supabase.auth.updateUser).toHaveBeenCalledWith({ password: "secret123" });
  });

  it("userHasEmailPasswordIdentity detects email provider", () => {
    const emailUser = {
      identities: [{ provider: "email" }],
    } as User;
    const oauthUser = {
      identities: [{ provider: "google" }],
    } as User;

    expect(userHasEmailPasswordIdentity(emailUser)).toBe(true);
    expect(userHasEmailPasswordIdentity(oauthUser)).toBe(false);
    expect(userHasEmailPasswordIdentity(null)).toBe(false);
  });
});
