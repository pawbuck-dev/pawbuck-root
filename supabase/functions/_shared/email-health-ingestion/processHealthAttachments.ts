import { saveOCRResults } from "../../process-pet-mail/dbPersistence.ts";
import { classifyAttachment } from "../../process-pet-mail/geminiClassifier.ts";
import { triggerOCR } from "../../process-pet-mail/ocrTrigger.ts";
import { loadEmailDocumentVerificationConfig } from "../emailDocumentVerificationConfig.ts";
import { validatePetFromDocument } from "../../process-pet-mail/petValidator.ts";
import { uploadAttachment } from "../../process-pet-mail/storageUploader.ts";
import type {
  DocumentClassification,
  DocumentType,
  EmailContext,
  ParsedAttachment,
  Pet,
  PetValidationResult,
  ProcessedAttachment,
} from "../../process-pet-mail/types.ts";
import { analyzePetDocumentInternal } from "../pawbuck-milo-api.ts";
import { uploadCanonicalDocument } from "./canonicalStorage.ts";
import { useLegacyOcrPipeline, useVaultHealthPipeline } from "./flags.ts";

export type ForcedDocumentPipelineType = Exclude<
  DocumentType,
  "irrelevant" | "billing_invoice" | "travel_certificate"
>;

export type ProcessHealthAttachmentsOptions = {
  ingestionSource: "email_ses" | "email_mailgun";
  /** Review Inbox / reprocess: hard override on PawBuck.API analyze-internal */
  apiDocumentTypeOverride?: string;
  forcedDocumentType?: ForcedDocumentPipelineType;
  forcedAttachmentIndexLimit?: number;
  /** Owner/admin Confirm: skip Gemini pet-id gate (user already picked pet + doc type). */
  skipPetVerification?: boolean;
  onMicrochipMismatch?: (
    pet: Pet,
    validation: PetValidationResult,
    filename: string,
  ) => Promise<void>;
};

/** Injectable deps for unit tests (defaults to production implementations). */
export type ProcessHealthAttachmentDeps = {
  classifyAttachment: typeof classifyAttachment;
  validatePetFromDocument: typeof validatePetFromDocument;
  loadEmailDocumentVerificationConfig: typeof loadEmailDocumentVerificationConfig;
  uploadCanonicalDocument: typeof uploadCanonicalDocument;
  analyzePetDocumentInternal: typeof analyzePetDocumentInternal;
  uploadAttachment: typeof uploadAttachment;
  triggerOCR: typeof triggerOCR;
  saveOCRResults: typeof saveOCRResults;
  useVaultHealthPipeline: typeof useVaultHealthPipeline;
  useLegacyOcrPipeline: typeof useLegacyOcrPipeline;
};

export const defaultProcessHealthAttachmentDeps: ProcessHealthAttachmentDeps = {
  classifyAttachment,
  validatePetFromDocument,
  loadEmailDocumentVerificationConfig,
  uploadCanonicalDocument,
  analyzePetDocumentInternal,
  uploadAttachment,
  triggerOCR,
  saveOCRResults,
  useVaultHealthPipeline,
  useLegacyOcrPipeline,
};

export async function processHealthAttachments(
  pet: Pet,
  attachments: ParsedAttachment[],
  emailContext: EmailContext,
  options: ProcessHealthAttachmentsOptions,
  deps: ProcessHealthAttachmentDeps = defaultProcessHealthAttachmentDeps,
): Promise<ProcessedAttachment[]> {
  const results: ProcessedAttachment[] = [];
  for (let i = 0; i < attachments.length; i++) {
    const attachment = attachments[i];
    const forced =
      options.forcedDocumentType &&
      (options.forcedAttachmentIndexLimit == null
        ? i < 1
        : i < options.forcedAttachmentIndexLimit)
        ? options.forcedDocumentType
        : undefined;

    const apiOverride = forced
      ? options.apiDocumentTypeOverride ?? forced
      : options.apiDocumentTypeOverride &&
          (options.forcedAttachmentIndexLimit == null
            ? i < 1
            : i < options.forcedAttachmentIndexLimit)
        ? options.apiDocumentTypeOverride
        : undefined;

    results.push(
      await processOne(
        pet,
        attachment,
        emailContext,
        options.ingestionSource,
        forced,
        apiOverride,
        options.onMicrochipMismatch,
        options.skipPetVerification,
        deps,
      ),
    );
  }
  return results;
}

async function processOne(
  pet: Pet,
  attachment: ParsedAttachment,
  emailContext: EmailContext,
  ingestionSource: "email_ses" | "email_mailgun",
  forcedDocumentType?: ForcedDocumentPipelineType,
  apiDocumentTypeOverride?: string,
  onMicrochipMismatch?: ProcessHealthAttachmentsOptions["onMicrochipMismatch"],
  skipPetVerification?: boolean,
  deps: ProcessHealthAttachmentDeps = defaultProcessHealthAttachmentDeps,
): Promise<ProcessedAttachment> {
  try {
    const classification: DocumentClassification = forcedDocumentType
      ? {
          type: forcedDocumentType,
          confidence: 1,
          reasoning: "User-confirmed document type (Review Inbox resolution)",
        }
      : await deps.classifyAttachment(
          attachment,
          emailContext.subject,
          emailContext.textBody,
        );

    if (classification.type === "irrelevant") {
      return skipped(attachment, classification);
    }

    const verificationConfig = await deps.loadEmailDocumentVerificationConfig(
      pet.country,
    );
    const petValidation = skipPetVerification
      ? {
          isValid: true,
          method: "owner_confirmed" as const,
          extractedInfo: {
            microchip: null,
            name: null,
            age: null,
            breed: null,
            gender: null,
            confidence: 0,
          },
          matchDetails: {},
        }
      : await deps.validatePetFromDocument(
          attachment,
          emailContext.subject,
          pet,
          {
            documentType: classification.type,
            verificationConfig,
          },
        );

    if (petValidation.microchipMismatchNotify && onMicrochipMismatch) {
      try {
        await onMicrochipMismatch(pet, petValidation, attachment.filename);
      } catch (e) {
        console.error("Microchip mismatch notification error:", e);
      }
    }

    if (!petValidation.isValid) {
      return validationSkipped(attachment, classification, petValidation);
    }

    if (deps.useVaultHealthPipeline()) {
      return await processVaultPath(
        pet,
        attachment,
        classification,
        ingestionSource,
        apiDocumentTypeOverride,
        petValidation,
        deps,
      );
    }

    if (deps.useLegacyOcrPipeline()) {
      return await processLegacyOcrPath(
        pet,
        attachment,
        classification,
        petValidation,
        deps,
      );
    }

    return failed(
      attachment,
      classification,
      "Vault pipeline disabled and legacy OCR not enabled",
      petValidation,
    );
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    return errorResult(attachment, msg);
  }
}

async function processVaultPath(
  pet: Pet,
  attachment: ParsedAttachment,
  classification: DocumentClassification,
  ingestionSource: string,
  apiDocumentTypeOverride: string | undefined,
  petValidation: PetValidationResult,
  deps: ProcessHealthAttachmentDeps,
): Promise<ProcessedAttachment> {
  const documentId = crypto.randomUUID();
  let storagePath: string;
  try {
    storagePath = await deps.uploadCanonicalDocument(
      pet,
      documentId,
      attachment.filename,
      attachment.content,
      attachment.mimeType,
    );
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return failed(attachment, classification, `Upload failed: ${msg}`, petValidation);
  }

  const analyze = await deps.analyzePetDocumentInternal({
    petId: pet.id,
    userId: pet.user_id,
    bucket: "pets",
    path: storagePath,
    mimeType: attachment.mimeType,
    documentId,
    documentTypeOverride: apiDocumentTypeOverride,
    ingestionSource,
  });

  if (!analyze.ok) {
    return {
      filename: attachment.filename,
      mimeType: attachment.mimeType,
      size: attachment.size,
      classification,
      uploaded: true,
      storagePath,
      ocrTriggered: false,
      ocrSuccess: false,
      dbInserted: false,
      vaultPersisted: false,
      vaultDocumentId: documentId,
      error: analyze.error,
      petValidation,
    };
  }

  return {
    filename: attachment.filename,
    mimeType: attachment.mimeType,
    size: attachment.size,
    classification,
    uploaded: true,
    storagePath,
    ocrTriggered: true,
    ocrSuccess: true,
    dbInserted: true,
    vaultPersisted: true,
    vaultDocumentId: analyze.row.id || documentId,
    petValidation,
  };
}

async function processLegacyOcrPath(
  pet: Pet,
  attachment: ParsedAttachment,
  classification: DocumentClassification,
  petValidation: PetValidationResult,
  deps: ProcessHealthAttachmentDeps,
): Promise<ProcessedAttachment> {
  let storagePath: string;
  try {
    storagePath = await deps.uploadAttachment(
      pet,
      classification.type,
      attachment.filename,
      attachment.content,
      attachment.mimeType,
    );
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return failed(attachment, classification, `Upload failed: ${msg}`, petValidation);
  }

  const ocrResult = await deps.triggerOCR(classification.type, "pets", storagePath);
  const dbResult =
    ocrResult.success && ocrResult.data
      ? await deps.saveOCRResults(classification.type, pet, storagePath, ocrResult.data)
      : { success: false, recordIds: undefined as string[] | undefined };

  return {
    filename: attachment.filename,
    mimeType: attachment.mimeType,
    size: attachment.size,
    classification,
    uploaded: true,
    storagePath,
    ocrTriggered: true,
    ocrResult: ocrResult.data,
    ocrSuccess: ocrResult.success,
    dbInserted: dbResult.success,
    dbRecordIds: dbResult.recordIds,
    petValidation,
    error: ocrResult.success ? undefined : ocrResult.error,
  };
}

function skipped(
  attachment: ParsedAttachment,
  classification: DocumentClassification,
): ProcessedAttachment {
  return {
    filename: attachment.filename,
    mimeType: attachment.mimeType,
    size: attachment.size,
    classification,
    uploaded: false,
    ocrTriggered: false,
    ocrSuccess: false,
    dbInserted: false,
  };
}

function validationSkipped(
  attachment: ParsedAttachment,
  classification: DocumentClassification,
  petValidation: PetValidationResult,
): ProcessedAttachment {
  return {
    filename: attachment.filename,
    mimeType: attachment.mimeType,
    size: attachment.size,
    classification,
    uploaded: false,
    ocrTriggered: false,
    ocrSuccess: false,
    dbInserted: false,
    petValidation,
    skippedReason: petValidation.skipReason,
  };
}

function failed(
  attachment: ParsedAttachment,
  classification: DocumentClassification,
  error: string,
  petValidation?: PetValidationResult,
): ProcessedAttachment {
  return {
    filename: attachment.filename,
    mimeType: attachment.mimeType,
    size: attachment.size,
    classification,
    uploaded: false,
    ocrTriggered: false,
    ocrSuccess: false,
    dbInserted: false,
    error,
    petValidation,
  };
}

function errorResult(attachment: ParsedAttachment, error: string): ProcessedAttachment {
  return {
    filename: attachment.filename,
    mimeType: attachment.mimeType,
    size: attachment.size,
    classification: {
      type: "irrelevant",
      confidence: 0,
      reasoning: "Processing failed",
    },
    uploaded: false,
    ocrTriggered: false,
    ocrSuccess: false,
    dbInserted: false,
    error,
  };
}
