import { validateTreeFile } from "../src/validate";
import * as path from "path";

describe("lethargy_v1.5 golden", () => {
  const tree = validateTreeFile(path.join(__dirname, "..", "trees", "lethargy_v1.5.json"));

  it("has summary map and red flags", () => {
    expect(tree.summaryFieldMap.SYMPTOM).toBeDefined();
    expect(tree.redFlagTriggers.length).toBeGreaterThan(0);
  });

  it("includes lethargy taxonomy", () => {
    expect(tree.symptomTaxonomy.some((t) => t.includes("letharg"))).toBe(true);
  });
});
