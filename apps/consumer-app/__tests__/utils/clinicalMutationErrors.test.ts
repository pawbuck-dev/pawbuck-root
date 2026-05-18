import { formatClinicalMutationError } from "@/utils/clinicalMutationErrors";

describe("formatClinicalMutationError", () => {
  it("maps duplicate vaccination prefix", () => {
    const result = formatClinicalMutationError(
      new Error("DUPLICATE_VACCINATION:foo")
    );
    expect(result.isDuplicate).toBe(true);
    expect(result.title).toBe("Duplicate vaccination");
  });

  it("maps duplicate medication prefix", () => {
    const result = formatClinicalMutationError(
      new Error("DUPLICATE_MEDICATION:bar")
    );
    expect(result.isDuplicate).toBe(true);
    expect(result.title).toBe("Duplicate medication");
  });
});
