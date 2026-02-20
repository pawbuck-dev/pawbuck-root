import { z } from "zod";

/**
 * Source of truth for what Milo extracts from documents (pet identification, vaccinations, etc.).
 * Used across consumer app, provider app, and backend/edge functions for validation and typing.
 */

/** Pet identification info extracted from documents (e.g. vet forms, certificates) */
export const extractedPetInfoSchema = z.object({
  microchip: z.string().nullable(),
  name: z.string().nullable(),
  age: z.string().nullable(), // e.g. "3 years", "6 months"
  breed: z.string().nullable(),
  gender: z.string().nullable(), // "Male", "Female", "M", "F", etc.
  confidence: z.number().min(0).max(100),
});

export type ExtractedPetInfo = z.infer<typeof extractedPetInfoSchema>;

/** Single vaccination record as extracted by Milo (OCR / AI) */
export const vaccinationRecordSchema = z.object({
  name: z.string(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "date must be YYYY-MM-DD"),
  next_due_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "next_due_date must be YYYY-MM-DD"),
  clinic_name: z.string(),
  notes: z.string().default(""),
  document_url: z.string().default(""),
});

export type VaccinationRecord = z.infer<typeof vaccinationRecordSchema>;

/** Response shape from vaccination OCR / extraction */
export const vaccinationOcrResponseSchema = z.object({
  vaccines: z.array(vaccinationRecordSchema),
});

export type VaccinationOcrResponse = z.infer<typeof vaccinationOcrResponseSchema>;

/** Document type classification (for email attachment routing) */
export const documentTypeSchema = z.enum([
  "medications",
  "lab_results",
  "clinical_exams",
  "vaccinations",
  "billing_invoice",
  "travel_certificate",
  "irrelevant",
]);

export type DocumentType = z.infer<typeof documentTypeSchema>;
