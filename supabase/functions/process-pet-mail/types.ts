export interface ParsedAttachment {
  filename: string;
  mimeType: string;
  size: number;
  content: string; // Base64 encoded
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
}

export interface S3Config {
  bucket: string;
  fileKey: string;
}

export type DocumentType =
  | "medications"
  | "lab_results"
  | "clinical_exams"
  | "vaccinations"
  | "irrelevant";

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
}

// Pet validation types (defined before ProcessedAttachment which uses them)
export type SkipReason = 
  | "no_pet_info"           // No identifiable info found in document
  | "microchip_mismatch"    // Microchip found but doesn't match pet record
  | "attributes_mismatch";  // Attributes (name/age/breed/gender) don't match

export type ValidationMethod = "microchip" | "attributes" | "none";

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

