import { petPossessiveLabel } from "@/utils/petCopy";

describe("petPossessiveLabel", () => {
  it("prefixes phrase with possessive pet name", () => {
    expect(petPossessiveLabel("Max", "Health Records")).toBe("Max's Health Records");
    expect(petPossessiveLabel("Bella", "Labs")).toBe("Bella's Labs");
  });

  it("returns phrase alone when name missing", () => {
    expect(petPossessiveLabel(undefined, "Health Records")).toBe("Health Records");
    expect(petPossessiveLabel("", "Labs")).toBe("Labs");
  });

  it("trims whitespace", () => {
    expect(petPossessiveLabel("  Coco  ", "Meds")).toBe("Coco's Meds");
  });
});
