import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  hasAcceptedMiloTriageDisclaimer,
  setAcceptedMiloTriageDisclaimer,
} from "@/services/miloTriageDisclaimer";

describe("miloTriageDisclaimer", () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
  });

  it("returns false until accepted", async () => {
    await expect(hasAcceptedMiloTriageDisclaimer("user-a")).resolves.toBe(false);
    await setAcceptedMiloTriageDisclaimer("user-a");
    await expect(hasAcceptedMiloTriageDisclaimer("user-a")).resolves.toBe(true);
  });

  it("is scoped per user id", async () => {
    await setAcceptedMiloTriageDisclaimer("user-b");
    await expect(hasAcceptedMiloTriageDisclaimer("user-b")).resolves.toBe(true);
    await expect(hasAcceptedMiloTriageDisclaimer("user-c")).resolves.toBe(false);
  });
});
