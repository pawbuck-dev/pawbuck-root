import type { PetLogSeverity } from "@/types/petLog";
import type { TriageContext } from "@/utils/miloTriage";
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

  it("uses the same milo idempotency key when owner triage text matches but stored note differs", () => {
    const owner = "vomiting 2x and diarrhea 5x";
    const a = extractPetLogEntry("5 episodes of diarrhea and 2 episodes of vomiting.", "p1", "u1", "health", undefined, owner);
    const b = extractPetLogEntry("Vomiting 2x and diarrhea 5x.", "p1", "u1", "health", undefined, owner);
    expect(a.milo_idempotency_key).toBe(b.milo_idempotency_key);
    expect(a.subtype).toBe("symptom");
  });
});

describe("noteHasClinicalTriagePrefix", () => {
  it("detects URGENT prefix", () => {
    expect(noteHasClinicalTriagePrefix("[URGENT] Dog is weak.")).toBe(true);
  });

  it("detects CRITICAL case-insensitively", () => {
    expect(noteHasClinicalTriagePrefix("[critical] Respiratory distress.")).toBe(true);
  });

  it("detects severe-summary line from vet-ready journal output", () => {
    expect(
      noteHasClinicalTriagePrefix(
        "**Observations:** …\nNote: Severe symptoms detected. Veterinary consultation recommended."
      )
    ).toBe(true);
  });

  it("returns false without prefix", () => {
    expect(noteHasClinicalTriagePrefix("Normal day.")).toBe(false);
  });
});

describe("assistantReplyForSeverity", () => {
  it("low severity omits routine vet disclaimer", () => {
    const t = assistantReplyForSeverity("low", "Bella");
    expect(t).toContain("Bella");
    expect(t.toLowerCase()).not.toContain("not a diagnosis");
    expect(t.toLowerCase()).not.toContain("veterinarian");
  });

  it("high severity uses single severe-symptom note line", () => {
    const t = assistantReplyForSeverity("high", "Bella");
    expect(t).toContain("Severe symptoms detected");
    expect(t).toContain("Veterinary consultation recommended");
  });

  it("urgent severity uses emergency prefix plus severe note", () => {
    const t = assistantReplyForSeverity("urgent", "Milo");
    expect(t.toLowerCase()).toContain("seek immediate");
    expect(t.toLowerCase()).toContain("emergency care");
    expect(t).toContain("Severe symptoms detected");
    expect(t).toContain("Veterinary consultation recommended");
  });
});

const SEVERITY_MATRIX: {
  text: string;
  expected: PetLogSeverity;
  ctx?: TriageContext;
}[] = [
  { text: "Milo is happy and playful", expected: "low" },
  { text: "played well and ate normally", expected: "low" },
  { text: "great mood today", expected: "low" },
  { text: "slept well through the night", expected: "low" },
  { text: "normal stool this morning", expected: "low" },
  { text: "scratching a lot behind the ears", expected: "medium" },
  { text: "sneezing occasionally", expected: "medium" },
  { text: "soft cough in the evening", expected: "medium" },
  { text: "limping slightly after the hike", expected: "medium" },
  { text: "random observation with no keywords", expected: "medium" },
  { text: "won't eat and seems tired", expected: "high" },
  { text: "threw up twice since lunch", expected: "high" },
  { text: "very lethargic all day", expected: "high" },
  { text: "diarrhea since yesterday evening", expected: "high" },
  { text: "Milo is bleeding from the gum", expected: "urgent" },
  { text: "had a seizure this morning", expected: "urgent" },
  { text: "hit by car — need help", expected: "urgent" },
  { text: "labored breathing at rest", expected: "urgent" },
  { text: "not breathing right — gasping", expected: "urgent" },
  { text: "collapsed in the hallway", expected: "urgent" },
  {
    text: "scratching after wheat treat",
    expected: "high",
    ctx: { allergies: ["wheat"] },
  },
];

function assertAssistantCopy(sev: PetLogSeverity, petName: string) {
  const t = assistantReplyForSeverity(sev, petName);
  switch (sev) {
    case "low":
      expect(t).toContain(petName);
      expect(t.toLowerCase()).not.toContain("veterinarian");
      expect(t.toLowerCase()).not.toContain("seek immediate");
      break;
    case "medium":
      expect(t).toContain(petName);
      expect(t).toContain("Continue monitoring");
      expect(t.toLowerCase()).not.toContain("seek immediate");
      break;
    case "high":
      expect(t).toContain("Severe symptoms detected");
      expect(t).toContain("Veterinary consultation recommended");
      expect(t.toLowerCase()).not.toContain("seek immediate");
      expect(t.toLowerCase()).not.toContain("emergency care now");
      break;
    case "urgent":
      expect(t.toLowerCase()).toContain("seek immediate");
      expect(t.toLowerCase()).toContain("emergency care");
      expect(t).toContain("Severe symptoms detected");
      break;
    default:
      throw new Error(`unexpected severity ${sev satisfies never}`);
  }
}

describe("severity matrix (predictable triage + assistant copy)", () => {
  it.each(SEVERITY_MATRIX)("mapSeverity → $expected", ({ text, expected, ctx }) => {
    expect(mapSeverity(text, ctx)).toBe(expected);
  });

  it("assistantReplyForSeverity matches tier rules for every matrix severity", () => {
    const tiers = new Set(SEVERITY_MATRIX.map((r) => r.expected));
    for (const sev of tiers) {
      assertAssistantCopy(sev, "Milo");
    }
  });

  it("combined worst-case: benign then catastrophic still yields urgent assistant copy", () => {
    const worst = severityFromConversationText(["Milo is happy", "Milo is bleeding and won't eat"]);
    expect(worst).toBe("urgent");
    assertAssistantCopy(worst, "Milo");
  });
});
