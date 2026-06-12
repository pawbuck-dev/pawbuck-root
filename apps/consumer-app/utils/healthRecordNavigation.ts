import { Href } from "expo-router";

export type HealthRecordTab = "vaccinations" | "medications" | "exams" | "lab-results";

export type BodyTrackerSegment = "intake" | "output" | "weight";

const BODY_TRACKER_SEGMENTS: BodyTrackerSegment[] = ["intake", "output", "weight"];

export function parseBodyTrackerSegment(value: string | undefined): BodyTrackerSegment {
  if (value && BODY_TRACKER_SEGMENTS.includes(value as BodyTrackerSegment)) {
    return value as BodyTrackerSegment;
  }
  return "intake";
}

/** Full href — Expo Router updates nested [id] reliably from a string path, not params-only replace. */
export function healthRecordHubHref(petId: string): Href {
  return `/(home)/health-record/${petId}` as Href;
}

export function healthRecordTabHref(petId: string, tab: HealthRecordTab): Href {
  return `/(home)/health-record/${petId}/(tabs)/${tab}` as Href;
}

export function healthRecordBodyTrackerHref(
  petId: string,
  segment: BodyTrackerSegment = "intake"
): Href {
  return `/(home)/health-record/${petId}/body-tracker?segment=${segment}` as Href;
}
