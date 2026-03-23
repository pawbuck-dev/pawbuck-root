import { getPawbuckApiBaseUrl } from "@/utils/pawbuckApi";

describe("getPawbuckApiBaseUrl", () => {
  const orig = process.env.EXPO_PUBLIC_PAWBUCK_API_URL;

  afterEach(() => {
    if (orig === undefined) delete process.env.EXPO_PUBLIC_PAWBUCK_API_URL;
    else process.env.EXPO_PUBLIC_PAWBUCK_API_URL = orig;
  });

  it("returns null when unset", () => {
    delete process.env.EXPO_PUBLIC_PAWBUCK_API_URL;
    expect(getPawbuckApiBaseUrl()).toBeNull();
  });

  it("trims and strips trailing slash", () => {
    process.env.EXPO_PUBLIC_PAWBUCK_API_URL = "  https://api.example.com/  ";
    expect(getPawbuckApiBaseUrl()).toBe("https://api.example.com");
  });
});
