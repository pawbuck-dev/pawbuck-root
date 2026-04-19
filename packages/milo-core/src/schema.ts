import { z } from "zod";

const isoDateRegex = /^\d{4}-\d{2}-\d{2}$/;
const isoDateMessage = "date must be YYYY-MM-DD (ISO-8601)";

/**
 * Full vault + classification taxonomy (Postgres enum `pet_document_type`, email routing, Milo vision).
 * Non-clinical: insurance_policy, pedigree, identity_document.
 */
export const petDocumentTypeSchema = z.enum([
  "medications",
  "lab_results",
  "clinical_exams",
  "vaccinations",
  "billing_invoice",
  "travel_certificate",
  "insurance_policy",
  "pedigree",
  "identity_document",
  "irrelevant",
]);

export type PetDocumentType = z.infer<typeof petDocumentTypeSchema>;

/** Gemini classification step — must match petDocumentTypeSchema values */
export const petDocumentClassificationSchema = z.object({
  documentType: petDocumentTypeSchema,
  confidence: z.number().min(0).max(100),
  reasoning: z.string(),
});

export type PetDocumentClassification = z.infer<typeof petDocumentClassificationSchema>;

/** Extraction for generic DocumentCard + pet_documents.extracted_json */
export const flexibleDocumentExtractionSchema = z.object({
  title: z.string(),
  summary: z.string(),
  primaryDate: z
    .string()
    .regex(isoDateRegex, isoDateMessage)
    .nullable()
    .optional(),
  keyFacts: z.array(
    z.object({
      label: z.string(),
      value: z.string(),
    })
  ),
  confidenceScore: z.number().min(0).max(100),
});

export type FlexibleDocumentExtraction = z.infer<typeof flexibleDocumentExtractionSchema>;

/** Document type enum for legacy MedicalRecord extraction (clinical-focused subset) */
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
