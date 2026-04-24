import {
  assistantReplyForSeverity,
  bumpSeverity,
  extractPetLogEntry,
  mapSeverity,
  maxSeverity,
  noteHasClinicalTriagePrefix,
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

  it("stores clinical summary in note but triages from owner lines", () => {
    const summary =
      "The dog demonstrates **Lethargy** and reduced food intake consistent with anorexia.";
    const owner = "won't eat\nvery tired all day";
    const e = extractPetLogEntry(summary, "p1", "u1", "health", undefined, owner);
    expect(e.note).toBe(summary);
    expect(e.severity).toBe("high");
    expect(e.tags).toContain("diet");
  });

  it("sets vet_flag from clinical prefix when severity is medium", () => {
    const e = extractPetLogEntry(
      "[URGENT] **Lethargy** noted.",
      "p1",
      "u1",
      "health",
      undefined,
      "a bit quiet today"
    );
    expect(e.vet_flag).toBe(true);
    expect(e.severity).toBe("medium");
  });
});

describe("noteHasClinicalTriagePrefix", () => {
  it("detects URGENT prefix", () => {
    expect(noteHasClinicalTriagePrefix("[URGENT] Dog is weak.")).toBe(true);
  });

  it("detects CRITICAL case-insensitively", () => {
    expect(noteHasClinicalTriagePrefix("[critical] Respiratory distress.")).toBe(true);
  });

  it("returns false without prefix", () => {
    expect(noteHasClinicalTriagePrefix("Normal day.")).toBe(false);
  });
});

describe("assistantReplyForSeverity", () => {
  it("includes disclaimer", () => {
    const t = assistantReplyForSeverity("low", "Bella");
    expect(t).toContain("Bella");
    expect(t.toLowerCase()).toContain("not a diagnosis");
  });
});
