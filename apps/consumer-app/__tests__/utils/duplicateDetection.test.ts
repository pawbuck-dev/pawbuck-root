import type { Tables } from "@/database.types";
import {
  isDuplicateClinicalExam,
  isDuplicateVaccination,
} from "@/utils/duplicateDetection";

describe("duplicateDetection", () => {
  describe("isDuplicateClinicalExam", () => {
    it("returns false when no matching exam", () => {
      const existing = [
        { exam_type: "Routine", exam_date: "2025-01-15" },
      ] as Tables<"clinical_exams">[];
      expect(
        isDuplicateClinicalExam(
          { exam_type: "Routine", exam_date: "2025-02-01" },
          existing
        )
      ).toBe(false);
    });

    it("detects same type and date (YYYY-MM-DD)", () => {
      const existing = [
        { exam_type: "Routine Checkup", exam_date: "2025-01-15" },
      ] as Tables<"clinical_exams">[];
      expect(
        isDuplicateClinicalExam(
          { exam_type: "routine checkup", exam_date: "2025-01-15T12:00:00.000Z" },
          existing
        )
      ).toBe(true);
    });

    it("returns false when exam_type is null", () => {
      expect(isDuplicateClinicalExam({ exam_type: null, exam_date: "2025-01-01" }, [])).toBe(
        false
      );
    });
  });

  describe("isDuplicateVaccination", () => {
    it("matches name case-insensitively and normalized dates", () => {
      const existing = [
        { name: "Rabies", date: "2024-06-01" },
      ] as Tables<"vaccinations">[];
      expect(
        isDuplicateVaccination({ name: "rabies", date: "2024-06-01T00:00:00Z" }, existing)
      ).toBe(true);
    });
  });
});
