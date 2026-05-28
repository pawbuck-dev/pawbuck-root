import {
  healthRecordHubHref,
  healthRecordTabHref,
} from "@/utils/healthRecordNavigation";

describe("healthRecordNavigation", () => {
  it("builds hub href with pet id in path", () => {
    expect(healthRecordHubHref("pet-awesome")).toBe("/(home)/health-record/pet-awesome");
  });

  it.each([
    ["vaccinations", "/(home)/health-record/pet-awesome/(tabs)/vaccinations"],
    ["medications", "/(home)/health-record/pet-awesome/(tabs)/medications"],
    ["exams", "/(home)/health-record/pet-awesome/(tabs)/exams"],
    ["lab-results", "/(home)/health-record/pet-awesome/(tabs)/lab-results"],
  ] as const)("builds %s tab href", (tab, expected) => {
    expect(healthRecordTabHref("pet-awesome", tab)).toBe(expected);
  });
});
