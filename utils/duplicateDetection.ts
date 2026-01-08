import { Tables } from "@/database.types";
import { LabResult } from "@/services/labResults";

/**
 * Normalize a date string to YYYY-MM-DD format for comparison
 * Handles both date-only strings ("2025-10-11") and ISO timestamps ("2025-10-11T00:00:00+00:00")
 */
function normalizeDate(dateString: string | null | undefined): string | null {
  if (!dateString) return null;
  
  // If it's already in YYYY-MM-DD format, return as is
  if (/^\d{4}-\d{2}-\d{2}$/.test(dateString)) {
    return dateString;
  }
  
  // If it's an ISO timestamp, extract just the date part
  const datePart = dateString.split('T')[0];
  if (/^\d{4}-\d{2}-\d{2}$/.test(datePart)) {
    return datePart;
  }
  
  // Try to parse and format
  try {
    const date = new Date(dateString);
    if (!isNaN(date.getTime())) {
      return date.toISOString().split('T')[0];
    }
  } catch {
    // If parsing fails, return null
  }
  
  return null;
}

/**
 * Check if a vaccination is a duplicate based on name and date
 */
export function isDuplicateVaccination(
  newVaccination: { name: string; date: string | null },
  existingVaccinations: Tables<"vaccinations">[]
): boolean {
  if (!newVaccination.date) return false;
  
  const normalizedNewDate = normalizeDate(newVaccination.date);
  if (!normalizedNewDate) return false;
  
  return existingVaccinations.some(
    (existing) => {
      const normalizedExistingDate = normalizeDate(existing.date);
      return (
        existing.name.toLowerCase().trim() === newVaccination.name.toLowerCase().trim() &&
        normalizedExistingDate === normalizedNewDate
      );
    }
  );
}

/**
 * Check if a medication is a duplicate based on name and start_date
 */
export function isDuplicateMedication(
  newMedication: { name: string; start_date: string | null },
  existingMedications: Tables<"medicines">[]
): boolean {
  if (!newMedication.start_date) return false;
  
  const normalizedNewDate = normalizeDate(newMedication.start_date);
  if (!normalizedNewDate) return false;
  
  return existingMedications.some(
    (existing) => {
      const normalizedExistingDate = normalizeDate(existing.start_date);
      return (
        existing.name.toLowerCase().trim() === newMedication.name.toLowerCase().trim() &&
        normalizedExistingDate === normalizedNewDate
      );
    }
  );
}

/**
 * Check if a clinical exam is a duplicate based on exam_type and exam_date
 */
export function isDuplicateClinicalExam(
  newExam: { exam_type: string | null; exam_date: string },
  existingExams: Tables<"clinical_exams">[]
): boolean {
  if (!newExam.exam_type) return false;
  
  const normalizedNewDate = normalizeDate(newExam.exam_date);
  if (!normalizedNewDate) return false;
  
  return existingExams.some(
    (existing) => {
      const normalizedExistingDate = normalizeDate(existing.exam_date);
      return (
        existing.exam_type?.toLowerCase().trim() === newExam.exam_type?.toLowerCase().trim() &&
        normalizedExistingDate === normalizedNewDate
      );
    }
  );
}

/**
 * Check if a lab result is a duplicate based on test_type, test_date, and lab_name
 */
export function isDuplicateLabResult(
  newLabResult: { test_type: string; test_date: string | null; lab_name: string },
  existingLabResults: LabResult[]
): boolean {
  if (!newLabResult.test_date) return false;
  
  const normalizedNewDate = normalizeDate(newLabResult.test_date);
  if (!normalizedNewDate) return false;
  
  return existingLabResults.some(
    (existing) => {
      const normalizedExistingDate = normalizeDate(existing.test_date);
      return (
        existing.test_type.toLowerCase().trim() === newLabResult.test_type.toLowerCase().trim() &&
        existing.lab_name.toLowerCase().trim() === newLabResult.lab_name.toLowerCase().trim() &&
        normalizedExistingDate === normalizedNewDate
      );
    }
  );
}

