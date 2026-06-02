import {
  ensureWalkBackgroundLocation,
  ensureWalkForegroundLocation,
  requestWalkBackgroundLocation,
} from "@/services/walkLocationPermissions";

function mockLocation(overrides: {
  foreground?: { status: string };
  background?: { status: string };
  requestForeground?: { status: string };
  requestBackground?: { status: string };
}) {
  return {
    getForegroundPermissionsAsync: jest.fn(async () => ({
      status: overrides.foreground?.status ?? "undetermined",
    })),
    requestForegroundPermissionsAsync: jest.fn(async () => ({
      status: overrides.requestForeground?.status ?? "granted",
    })),
    getBackgroundPermissionsAsync: jest.fn(async () => ({
      status: overrides.background?.status ?? "undetermined",
    })),
    requestBackgroundPermissionsAsync: jest.fn(async () => ({
      status: overrides.requestBackground?.status ?? "granted",
    })),
  } as unknown as typeof import("expo-location");
}

describe("walkLocationPermissions", () => {
  describe("ensureWalkForegroundLocation", () => {
    it("returns granted without requesting when already granted", async () => {
      const Location = mockLocation({ foreground: { status: "granted" } });
      const result = await ensureWalkForegroundLocation(Location);
      expect(result.granted).toBe(true);
      expect(Location.requestForegroundPermissionsAsync).not.toHaveBeenCalled();
    });

    it("returns denied without requesting when permanently denied", async () => {
      const Location = mockLocation({ foreground: { status: "denied" } });
      const result = await ensureWalkForegroundLocation(Location);
      expect(result.granted).toBe(false);
      expect(Location.requestForegroundPermissionsAsync).not.toHaveBeenCalled();
    });

    it("requests only when undetermined", async () => {
      const Location = mockLocation({
        foreground: { status: "undetermined" },
        requestForeground: { status: "granted" },
      });
      const result = await ensureWalkForegroundLocation(Location);
      expect(result.granted).toBe(true);
      expect(Location.requestForegroundPermissionsAsync).toHaveBeenCalledTimes(1);
    });
  });

  describe("ensureWalkBackgroundLocation", () => {
    it("returns background without requesting when already granted", async () => {
      const Location = mockLocation({ background: { status: "granted" } });
      const result = await ensureWalkBackgroundLocation(Location);
      expect(result).toEqual({ mode: "background", granted: true });
      expect(Location.requestBackgroundPermissionsAsync).not.toHaveBeenCalled();
    });

    it("returns foreground_only when denied without requesting", async () => {
      const Location = mockLocation({ background: { status: "denied" } });
      const result = await ensureWalkBackgroundLocation(Location);
      expect(result).toEqual({ mode: "foreground_only", granted: false });
      expect(Location.requestBackgroundPermissionsAsync).not.toHaveBeenCalled();
    });

    it("requests once when undetermined", async () => {
      const Location = mockLocation({
        background: { status: "undetermined" },
        requestBackground: { status: "granted" },
      });
      const result = await ensureWalkBackgroundLocation(Location);
      expect(result).toEqual({ mode: "background", granted: true });
      expect(Location.requestBackgroundPermissionsAsync).toHaveBeenCalledTimes(1);
    });
  });

  describe("requestWalkBackgroundLocation", () => {
    it("delegates to ensureWalkBackgroundLocation", async () => {
      const Location = mockLocation({ background: { status: "granted" } });
      const result = await requestWalkBackgroundLocation(Location);
      expect(result).toEqual({ mode: "background", granted: true });
    });
  });
});
