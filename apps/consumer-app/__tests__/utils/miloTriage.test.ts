import {
  assistantReplyForSeverity,
  bumpSeverity,
  extractPetLogEntry,
  mapSeverity,
  maxSeverity,
  severityFromConversationText,
} from "@/utils/miloTriage";

describe("mapSeverity", () => {
  it("returns urgent for seizure", () => {
    expect(mapSeverity("My dog had a seizure")).toBe("urgent");
  });

  it("returns high for vomiting twice", () => {
    expect(mapSeverity("threw up twice today")).toBe("high");
  });

  it("returns medium for scratching", () => {
    expect(mapSeverity("scratching a lot")).toBe("medium");
  });

  it("returns low for positive routine", () => {
    expect(mapSeverity("played well and ate normally")).toBe("low");
  });

  it("bumps when allergy label appears in text", () => {
    expect(
      mapSeverity("scratching after wheat treat", { allergies: ["wheat"] })
    ).toBe("high");
  });
});

describe("bumpSeverity", () => {
  it("steps low to medium", () => {
    expect(bumpSeverity("low")).toBe("medium");
  });

  it("caps at urgent", () => {
    expect(bumpSeverity("urgent")).toBe("urgent");
  });
});

describe("maxSeverity", () => {
  it("returns the higher of two levels", () => {
    expect(maxSeverity("low", "high")).toBe("high");
    expect(maxSeverity("urgent", "medium")).toBe("urgent");
  });
});

describe("severityFromConversationText", () => {
  it("returns worst across turns", () => {
    expect(
      severityFromConversationText(["played well", "then started vomiting"])
    ).toBe("high");
  });
});

describe("extractPetLogEntry", () => {
  it("sets vet_flag for high severity", () => {
    const e = extractPetLogEntry("vomiting and diarrhea", "p1", "u1", "health");
    expect(e.vet_flag).toBe(true);
    expect(e.severity).toBe("high");
  });

  it("respects behavioral tab", () => {
    const e = extractPetLogEntry("barking at guests", "p1", "u1", "behavioral");
    expect(e.domain).toBe("behavioral");
  });
});

describe("assistantReplyForSeverity", () => {
  it("includes disclaimer", () => {
    const t = assistantReplyForSeverity("low", "Bella");
    expect(t).toContain("Bella");
    expect(t.toLowerCase()).toContain("not a diagnosis");
  });
});
