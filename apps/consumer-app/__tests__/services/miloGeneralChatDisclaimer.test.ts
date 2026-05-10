import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  hasAcceptedMiloGeneralChatDisclaimer,
  setAcceptedMiloGeneralChatDisclaimer,
} from "@/services/miloGeneralChatDisclaimer";

describe("miloGeneralChatDisclaimer", () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
  });

  it("returns false until accepted", async () => {
    await expect(hasAcceptedMiloGeneralChatDisclaimer("user-1")).resolves.toBe(false);
    await setAcceptedMiloGeneralChatDisclaimer("user-1");
    await expect(hasAcceptedMiloGeneralChatDisclaimer("user-1")).resolves.toBe(true);
  });

  it("uses a different storage key than journal triage", async () => {
    await setAcceptedMiloGeneralChatDisclaimer("user-2");
    const keys = await AsyncStorage.getAllKeys();
    expect(keys.some((k) => k.includes("general_chat"))).toBe(true);
    expect(keys.some((k) => k.includes("journal_triage"))).toBe(false);
  });
});
