export {
  extractedPetInfoSchema,
  vaccinationRecordSchema,
  vaccinationOcrResponseSchema,
  documentTypeSchema,
  type ExtractedPetInfo,
  type VaccinationRecord,
  type VaccinationOcrResponse,
  type DocumentType,
} from "./pet-records.schema";

export {
  MedicalRecordSchema,
  medicalRecordDocumentTypeSchema,
  medicalRecordItemSchema,
  petDocumentTypeSchema,
  petDocumentClassificationSchema,
  flexibleDocumentExtractionSchema,
  type MedicalRecord,
  type MedicalRecordItem,
  type PetDocumentType,
  type PetDocumentClassification,
  type FlexibleDocumentExtraction,
} from "./schema";

export { hasVaccinationAdministrationProof } from "./vaccination-extraction";
export { MEDICAL_RECORD_EXTRACTION_SYSTEM_PROMPT } from "./prompts/extraction-prompt";
export { PET_DOCUMENT_CLASSIFICATION_SYSTEM_PROMPT } from "./prompts/classification-prompt";
export {
  FLEXIBLE_DOCUMENT_EXTRACTION_SYSTEM_PROMPT,
  BILLING_INVOICE_FLEXIBLE_EXTRACTION_SUFFIX,
  getFlexibleExtractionPrompt,
} from "./prompts/flexible-extraction-prompt";
