import { Href } from "expo-router";

export type HealthRecordTab = "vaccinations" | "medications" | "exams" | "lab-results";

/** Full href — Expo Router updates nested [id] reliably from a string path, not params-only replace. */
export function healthRecordHubHref(petId: string): Href {
  return `/(home)/health-record/${petId}` as Href;
}

export function healthRecordTabHref(petId: string, tab: HealthRecordTab): Href {
  return `/(home)/health-record/${petId}/(tabs)/${tab}` as Href;
}
