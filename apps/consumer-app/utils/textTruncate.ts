/** Ends a sentence inside the preview window (period / bang / question / ellipsis). */
const SENTENCE_RE = /[.!?\u2026]["']?(\s|$)/g;

/**
 * Truncate so we do not split mid-word; prefer ending after a sentence terminator when possible.
 */
export function truncateAtSentenceOrWord(text: string, maxChars: number): { preview: string; truncated: boolean } {
  const t = text.trim();
  if (t.length <= maxChars) {
    return { preview: t, truncated: false };
  }

  const hard = t.slice(0, maxChars);
  const sentenceMatch = [...hard.matchAll(SENTENCE_RE)].pop();
  let cut = sentenceMatch && sentenceMatch.index != null ? sentenceMatch.index + sentenceMatch[0].length : -1;
  if (cut > 0 && cut <= maxChars) {
    return { preview: t.slice(0, cut).trimEnd(), truncated: true };
  }

  const lastSpace = hard.lastIndexOf(" ");
  if (lastSpace > Math.floor(maxChars * 0.55)) {
    return { preview: t.slice(0, lastSpace).trimEnd(), truncated: true };
  }

  return { preview: hard.trimEnd(), truncated: true };
}
