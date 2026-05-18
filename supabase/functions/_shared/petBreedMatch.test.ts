import {
  matchBreeds,
  normalizeBreedString,
  splitBreedComponents,
} from "./petBreedMatch.ts";
import { assertEquals } from "jsr:@std/assert";

function similarityRatio(a: string, b: string): number {
  const x = a.toLowerCase();
  const y = b.toLowerCase();
  if (x === y) return 1;
  if (x.includes(y) || y.includes(x)) {
    const shorter = x.length < y.length ? x : y;
    const longer = x.length >= y.length ? x : y;
    return shorter.length / longer.length;
  }
  return 0.5;
}

Deno.test("splitBreedComponents handles slash and mixed label", () => {
  const parts = splitBreedComponents("Shih Tzu/Yorkshire Terrier (Mixed)");
  assertEquals(parts.includes("shih tzu"), true);
  assertEquals(parts.includes("yorkshire terrier"), true);
});

Deno.test("matchBreeds passes when profile breed is one cross component", () => {
  const result = matchBreeds(
    "Shih Tzu/Yorkshire Terrier (Mixed)",
    "Yorkshire Terrier",
    similarityRatio,
    0.7,
  );
  assertEquals(result.matches, true);
});

Deno.test("matchBreeds passes exact single breed", () => {
  const result = matchBreeds(
    "Golden Retriever",
    "Golden Retriever",
    similarityRatio,
    0.7,
  );
  assertEquals(result.matches, true);
});

Deno.test("matchBreeds fails unrelated breeds", () => {
  const result = matchBreeds(
    "German Shepherd",
    "Yorkshire Terrier",
    similarityRatio,
    0.7,
  );
  assertEquals(result.matches, false);
});

Deno.test("normalizeBreedString strips parentheticals", () => {
  assertEquals(
    normalizeBreedString("Labrador Retriever (Mixed)"),
    "labrador retriever",
  );
});
