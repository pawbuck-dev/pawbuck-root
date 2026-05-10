import { computeMiloJournalIdempotencyKey, fnv1a32Hex } from "@/utils/miloJournalIdempotency";

describe("fnv1a32Hex", () => {
  it("is stable for the same input", () => {
    expect(fnv1a32Hex("a")).toBe(fnv1a32Hex("a"));
  });
});

describe("computeMiloJournalIdempotencyKey", () => {
  it("normalizes whitespace and case in triage text", () => {
    const a = computeMiloJournalIdempotencyKey({
      petId: "p1",
      domain: "health",
      subtype: "symptom",
      triageSourceText: "  Vomiting\n\nand   Diarrhea  ",
    });
    const b = computeMiloJournalIdempotencyKey({
      petId: "p1",
      domain: "health",
      subtype: "symptom",
      triageSourceText: "vomiting and diarrhea",
    });
    expect(a).toBe(b);
  });

  it("differs when subtype differs", () => {
    const a = computeMiloJournalIdempotencyKey({
      petId: "p1",
      domain: "health",
      subtype: "symptom",
      triageSourceText: "ate well",
    });
    const b = computeMiloJournalIdempotencyKey({
      petId: "p1",
      domain: "health",
      subtype: "diet",
      triageSourceText: "ate well",
    });
    expect(a).not.toBe(b);
  });
});
