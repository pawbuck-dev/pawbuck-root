/**
 * Breed matching for email document verification.
 * Handles cross/mixed breeds (e.g. profile "Yorkshire Terrier" vs document "Shih Tzu/Yorkshire Terrier (Mixed)").
 */

export function normalizeBreedString(raw: string): string {
  return raw
    .toLowerCase()
    .trim()
    .replace(/\s*\([^)]*\)\s*/g, " ")
    .replace(/\bmixed\b/g, "")
    .replace(/\bcross\b/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

/** Split compound breeds: "Shih Tzu/Yorkshire Terrier", "Lab & Poodle", "A and B". */
export function splitBreedComponents(raw: string): string[] {
  const normalized = normalizeBreedString(raw);
  if (!normalized) return [];
  const parts = normalized
    .split(/\s*[/,&]\s*|\s+and\s+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
  return parts.length > 0 ? parts : [normalized];
}

export type BreedMatchResult = {
  similarity: number;
  matches: boolean;
  isLikelyVariation?: boolean;
};

export function matchBreeds(
  extractedBreed: string | null,
  profileBreed: string,
  similarityRatio: (a: string, b: string) => number,
  threshold: number,
): BreedMatchResult {
  if (!extractedBreed || !profileBreed.trim()) {
    return { similarity: 0, matches: false };
  }

  const prof = normalizeBreedString(profileBreed);
  const ext = normalizeBreedString(extractedBreed);
  if (!prof || !ext) return { similarity: 0, matches: false };

  const fullSim = similarityRatio(ext, prof);
  if (fullSim >= threshold) {
    return { similarity: fullSim, matches: true };
  }

  const components = splitBreedComponents(extractedBreed);
  let bestSim = fullSim;

  for (const component of components) {
    const comp = normalizeBreedString(component);
    if (!comp) continue;

    const compSim = similarityRatio(comp, prof);
    bestSim = Math.max(bestSim, compSim);
    if (compSim >= threshold) {
      return { similarity: compSim, matches: true, isLikelyVariation: true };
    }

    if (componentMatchesProfile(comp, prof, compSim, similarityRatio, threshold)) {
      return {
        similarity: Math.max(compSim, 0.85),
        matches: true,
        isLikelyVariation: true,
      };
    }
  }

  if (componentMatchesProfile(ext, prof, fullSim, similarityRatio, threshold)) {
    return { similarity: Math.max(fullSim, 0.85), matches: true, isLikelyVariation: true };
  }

  return { similarity: bestSim, matches: false };
}

function componentMatchesProfile(
  component: string,
  profile: string,
  similarity: number,
  similarityRatio: (a: string, b: string) => number,
  threshold: number,
): boolean {
  if (component === profile) return true;
  if (similarity >= threshold) return true;

  const profileWords = profile.split(/\s+/).filter((w) => w.length > 2);
  if (
    profileWords.length >= 2 &&
    profileWords.every((w) => component.includes(w))
  ) {
    return true;
  }

  const profileWordCount = profile.split(/\s+/).filter(Boolean).length;
  if (profile.length >= 8 && profileWordCount >= 2 && component.includes(profile)) {
    return true;
  }

  if (profileWordCount === 1 && profile.length < 12) {
    return similarity >= threshold;
  }

  return false;
}
