import { validateTreeFile } from "../src/validate";
import * as path from "path";

describe("vomiting_v1.5 golden", () => {
  const tree = validateTreeFile(path.join(__dirname, "..", "trees", "vomiting_v1.5.json"));

  it("has six or fewer clinical questions before freeform", () => {
    const clinical = tree.questions.filter((q) => q.step >= 2 && q.step <= 6);
    expect(clinical.length).toBeLessThanOrEqual(tree.maxQuestions + 2);
  });

  it("maps summary fields for key answers", () => {
    expect(tree.summaryFieldMap.SYMPTOM).toBeDefined();
    expect(tree.redFlagTriggers.length).toBeGreaterThan(0);
  });

  it("includes vomiting taxonomy", () => {
    expect(tree.symptomTaxonomy).toContain("vomiting");
  });
});
