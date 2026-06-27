export interface ParsedAttachment {
  filename: string;
  mimeType: string;
  size: number;
  content: string; // Base64 encoded
  /** When true, full JSON exceeded archive size cap; Open/download will not have file bytes. */
  contentWasStrippedForArchive?: boolean;
}

export interface ParsedEmail {
  from: { name: string; address: string } | null;
  to: { name: string; address: string }[];
  cc: { name: string; address: string }[];
  subject: string;
  date: string | null;
  messageId: string | null;
  textBody: string | null;
  htmlBody: string | null;
  attachments: ParsedAttachment[];
  /** How attachments were discovered (for missing-attachment diagnostics). */
  attachmentDiagnostics?: {
    mailgunJsonListed: number;
    mailgunFetchFailures: number;
    inlineFormExtracted: number;
    mailgunAttachmentCountField: number | null;
  };
}

export interface MailgunConfig {
  messageId: string;
}

export type DocumentType =
  | "medications"
  | "lab_results"
  | "clinical_exams"
  | "vaccinations"
  | "billing_invoice"
  | "travel_certificate"
  | "irrelevant";

/** Review Inbox resolution: force pipeline to treat attachment as this type (skips Gemini classify). */
export type ForcedDocumentPipelineType = Exclude<
  DocumentType,
  "irrelevant" | "billing_invoice" | "travel_certificate"
>;

export interface DocumentClassification {
  type: DocumentType;
  confidence: number;
  reasoning?: string;
}

export interface Pet {
  id: string;
  name: string;
  email_id: string;
  user_id: string;
  animal_type: string;
  breed: string;
  microchip_number: string | null;
  date_of_birth: string;
  sex: string;
  country?: string;
  home_timezone?: string | null;
}

// Pet validation types (defined before ProcessedAttachment which uses them)
export type SkipReason =
  | "no_pet_info"
  | "breed_required_on_document"
  | "microchip_mismatch"
  | "attributes_mismatch";

export type ValidationMethod = "microchip" | "attributes" | "name_only" | "none";

export interface ExtractedPetInfo {
  microchip: string | null;
  name: string | null;
  age: string | null;        // e.g., "3 years", "6 months"
  breed: string | null;
  gender: string | null;     // "Male", "Female", "M", "F"
  confidence: number;
}

export interface MatchDetails {
  microchipMatch?: boolean;
  nameMatch?: { similarity: number; matches: boolean };
  ageMatch?: boolean;
  breedMatch?: { similarity: number; matches: boolean };
  genderMatch?: boolean;
}

export interface PetValidationResult {
  isValid: boolean;
  method: ValidationMethod;
  extractedInfo: ExtractedPetInfo;
  matchDetails: MatchDetails;
  skipReason?: SkipReason;
  /** Document microchip differs from profile; processing may still continue (name+breed path). */
  microchipMismatchNotify?: boolean;
  microchipDocumentValue?: string | null;
  microchipProfileValue?: string | null;
}

export interface ProcessedAttachment {
  filename: string;
  mimeType: string;
  size: number;
  classification: DocumentClassification;
  uploaded: boolean;
  storagePath?: string;
  ocrTriggered: boolean;
  ocrResult?: any;
  ocrSuccess: boolean;
  dbInserted: boolean;
  dbRecordIds?: string[];
  vaultPersisted?: boolean;
  vaultDocumentId?: string;
  error?: string;
  // Pet validation fields
  petValidation?: PetValidationResult;
  skippedReason?: SkipReason;
}

export interface ProcessingResult {
  success: boolean;
  pet?: Pet;
  email: {
    from: string | null;
    subject: string;
    date: string | null;
  };
  processedAttachments: ProcessedAttachment[];
  error?: string;
}

// Email context for processing
export interface EmailContext {
  subject: string;
  textBody: string | null;
}

// Sender verification result
export interface SenderVerificationResult {
  canProceed: boolean;
  response?: Response;
}

// Email info for responses
export interface EmailInfo {
  from: string | null;
  subject: string;
  date: string | null;
}

// Pet info for responses
export interface PetInfo {
  id: string;
  name: string;
}

