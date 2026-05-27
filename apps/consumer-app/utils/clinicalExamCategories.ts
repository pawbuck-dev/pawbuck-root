export type ExamCategory = "Routine Checkup" | "Invoice" | "Travel" | "Other";

export const EXAM_CATEGORIES: ExamCategory[] = [
  "Routine Checkup",
  "Invoice",
  "Travel",
  "Other",
];

/** Map stored exam_type (OCR, email, manual) into a list section. */
export function categorizeClinicalExamType(examType: string | null | undefined): ExamCategory {
  const t = (examType ?? "").trim().toLowerCase();
  if (!t) return "Other";
  if (t.includes("travel")) return "Travel";
  if (t === "invoice" || t.includes("invoice")) return "Invoice";
  if (
    t === "routine checkup" ||
    t.includes("checkup") ||
    t.includes("check-up") ||
    t.includes("wellness") ||
    t.includes("routine")
  ) {
    return "Routine Checkup";
  }
  return "Other";
}

export function groupClinicalExamsByCategory<T extends { exam_type: string | null }>(
  exams: T[],
): Record<ExamCategory, T[]> {
  const grouped: Record<ExamCategory, T[]> = {
    "Routine Checkup": [],
    Invoice: [],
    Travel: [],
    Other: [],
  };
  for (const exam of exams) {
    grouped[categorizeClinicalExamType(exam.exam_type)].push(exam);
  }
  return grouped;
}
