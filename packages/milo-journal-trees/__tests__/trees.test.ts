import { loadAllTreesFromDir } from "../src/validate";
import * as path from "path";

describe("journal trees", () => {
  const dir = path.join(__dirname, "..", "trees");

  it("loads and validates all tree JSON files", () => {
    const trees = loadAllTreesFromDir(dir);
    expect(trees.length).toBeGreaterThanOrEqual(8);
    const ids = new Set(trees.map((t) => t.treeId));
    expect(ids.has("vomiting_v1.5")).toBe(true);
    expect(ids.has("lethargy_v1.5")).toBe(true);
    expect(ids.has("walk_v1.5")).toBe(true);
  });
});
