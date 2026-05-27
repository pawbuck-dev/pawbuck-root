import {
  categorizeClinicalExamType,
  groupClinicalExamsByCategory,
} from "@/utils/clinicalExamCategories";

describe("categorizeClinicalExamType", () => {
  it("maps standard upload labels", () => {
    expect(categorizeClinicalExamType("Routine Checkup")).toBe("Routine Checkup");
    expect(categorizeClinicalExamType("Invoice")).toBe("Invoice");
    expect(categorizeClinicalExamType("Travel Certificate")).toBe("Travel");
  });

  it("maps OCR/email free-text exam types into Other", () => {
    expect(categorizeClinicalExamType("Elizabethan collar")).toBe("Other");
    expect(categorizeClinicalExamType("Surgery follow-up")).toBe("Other");
  });

  it("maps fuzzy checkup strings", () => {
    expect(categorizeClinicalExamType("Annual wellness visit")).toBe("Routine Checkup");
  });
});

describe("groupClinicalExamsByCategory", () => {
  it("keeps uncategorized exams visible under Other", () => {
    const grouped = groupClinicalExamsByCategory([
      { exam_type: "Elizabethan collar" },
      { exam_type: "Routine Checkup" },
    ]);
    expect(grouped.Other).toHaveLength(1);
    expect(grouped["Routine Checkup"]).toHaveLength(1);
  });
});
