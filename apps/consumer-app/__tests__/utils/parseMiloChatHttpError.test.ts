import { parseMiloChatHttpError } from "@/utils/parseMiloChatHttpError";

describe("parseMiloChatHttpError", () => {
  it("extracts message from JSON error bodies", () => {
    expect(parseMiloChatHttpError('{"message":"Database not configured"}', 500)).toBe(
      "Database not configured"
    );
  });

  it("returns status-specific fallback for empty HTML bodies", () => {
    expect(parseMiloChatHttpError("<html>Gateway Timeout</html>", 504)).toBe("server error (504)");
  });

  it("returns plain text when short", () => {
    expect(parseMiloChatHttpError("Network request failed", 0)).toBe("Network request failed");
  });
});
