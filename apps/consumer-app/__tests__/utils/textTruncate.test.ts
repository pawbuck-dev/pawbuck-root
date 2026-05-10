import { truncateAtSentenceOrWord } from "@/utils/textTruncate";

describe("truncateAtSentenceOrWord", () => {
  it("returns full text when under limit", () => {
    expect(truncateAtSentenceOrWord("Short.", 80)).toEqual({ preview: "Short.", truncated: false });
  });

  it("cuts at last sentence end inside the window", () => {
    const t = "Pruritus is mild. Discharge from the left ear persists for several days.";
    const r = truncateAtSentenceOrWord(t, 28);
    expect(r.preview).toBe("Pruritus is mild.");
    expect(r.truncated).toBe(true);
  });

  it("falls back to last word boundary when no sentence end", () => {
    const t = "Pruritus and ear discharge without a sentence break here";
    const r = truncateAtSentenceOrWord(t, 22);
    expect(r.preview.endsWith("Pruritus and ear")).toBe(true);
    expect(r.truncated).toBe(true);
  });
});
