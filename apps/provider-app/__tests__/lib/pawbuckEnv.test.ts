import { getPawbuckApiBaseUrl } from "../../lib/pawbuckEnv";

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

  it("normalizes base URL", () => {
    process.env.EXPO_PUBLIC_PAWBUCK_API_URL = "https://api.test/";
    expect(getPawbuckApiBaseUrl()).toBe("https://api.test");
  });
});
