import { subtypeLabel } from "@/constants/petJournal";

describe("subtypeLabel", () => {
  it("returns label for known health subtype", () => {
    expect(subtypeLabel("health", "symptom")).toBe("Symptom");
  });

  it("returns raw id for unknown subtype", () => {
    expect(subtypeLabel("health", "custom")).toBe("custom");
  });
});
