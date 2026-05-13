import { isRlsAccessDeniedError, isSessionExpiredLikeError } from "@/utils/supabaseAuthErrors";

describe("supabaseAuthErrors", () => {
  describe("isSessionExpiredLikeError", () => {
    it("detects JWT / refresh wording", () => {
      expect(isSessionExpiredLikeError(new Error("JWT expired"))).toBe(true);
      expect(isSessionExpiredLikeError({ message: "Invalid Refresh Token: Refresh Token Not Found" })).toBe(true);
      expect(isSessionExpiredLikeError({ message: "Auth session missing!", code: "unknown" })).toBe(true);
    });

    it("detects PostgREST JWT code", () => {
      expect(isSessionExpiredLikeError({ message: "invalid", code: "PGRST301" })).toBe(true);
    });

    it("detects HTTP 401 status", () => {
      expect(isSessionExpiredLikeError({ status: 401, message: "Unauthorized" })).toBe(true);
    });

    it("returns false for unrelated errors", () => {
      expect(isSessionExpiredLikeError(new Error("Network request failed"))).toBe(false);
      expect(isSessionExpiredLikeError({ code: "42501", message: "permission denied" })).toBe(false);
    });

    it("does not treat pet insert RPC auth wording as session expiry", () => {
      expect(isSessionExpiredLikeError({ message: "not authenticated", code: "28000" })).toBe(false);
    });
  });

  describe("isRlsAccessDeniedError", () => {
    it("detects Postgres permission denied", () => {
      expect(isRlsAccessDeniedError({ code: "42501", message: "permission denied for table pets" })).toBe(true);
    });

    it("detects RLS wording", () => {
      expect(
        isRlsAccessDeniedError({ message: "new row violates row-level security policy for table pets" })
      ).toBe(true);
    });

    it("returns false for JWT-style messages", () => {
      expect(isRlsAccessDeniedError(new Error("JWT expired"))).toBe(false);
    });
  });
});
