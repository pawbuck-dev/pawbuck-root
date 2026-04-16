import { normalizePawbuckApiBase } from "@/api/supportClient";

describe("normalizePawbuckApiBase", () => {
  it("returns origin only, strips paths accidentally pasted from docs or metrics URLs", () => {
    expect(normalizePawbuckApiBase("https://api.pawbuck.com/api/support/metrics")).toBe("https://api.pawbuck.com");
    expect(normalizePawbuckApiBase("https://api.pawbuck.com")).toBe("https://api.pawbuck.com");
  });

  it("defaults bare hostname to https", () => {
    expect(normalizePawbuckApiBase("api.pawbuck.com")).toBe("https://api.pawbuck.com");
  });

  it("preserves localhost with port", () => {
    expect(normalizePawbuckApiBase("http://localhost:5289")).toBe("http://localhost:5289");
  });
});
