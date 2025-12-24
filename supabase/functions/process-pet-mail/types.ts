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
