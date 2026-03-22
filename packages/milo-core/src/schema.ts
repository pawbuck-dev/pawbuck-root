import { z } from "zod";

const isoDateRegex = /^\d{4}-\d{2}-\d{2}$/;
const isoDateMessage = "date must be YYYY-MM-DD (ISO-8601)";

/** Document type enum aligned with pet-records and email attachment routing */
export const medicalRecordDocumentTypeSchema = z.enum([
  "medications",
  "lab_results",
  "clinical_exams",
  "vaccinations",
  "billing_invoice",
  "travel_certificate",
  "irrelevant",
]);

/** Single line item (vaccine, medication, etc.) with name, category, and expiry */
export const medicalRecordItemSchema = z.object({
  name: z.string(),
  category: z.string(),
  expiryDate: z.string().regex(isoDateRegex, isoDateMessage),
});

/** Full medical record extraction for Vision-LLM output validation */
export const MedicalRecordSchema = z.object({
  petName: z.string(),
  documentType: medicalRecordDocumentTypeSchema,
  clinicName: z.string(),
  dateOfVisit: z.string().regex(isoDateRegex, isoDateMessage),
  items: z.array(medicalRecordItemSchema),
  confidenceScore: z.number().min(0).max(100),
});

export type MedicalRecord = z.infer<typeof MedicalRecordSchema>;
export type MedicalRecordItem = z.infer<typeof medicalRecordItemSchema>;
