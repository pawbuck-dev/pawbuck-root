import { saveOCRResults } from "../dbPersistence.ts";
import { classifyAttachment } from "../geminiClassifier.ts";
import { triggerOCR } from "../ocrTrigger.ts";
import { formatValidationResult, validatePetFromDocument } from "../petValidator.ts";
import { uploadAttachment } from "../storageUploader.ts";
import type {
  DocumentClassification,
  EmailContext,
  ParsedAttachment,
  Pet,
  PetValidationResult,
  ProcessedAttachment,
  SkipReason,
} from "../types.ts";

/**
 * Process all attachments for a pet
 */
export async function processAttachments(
  pet: Pet,
  attachments: ParsedAttachment[],
  emailContext: EmailContext
): Promise<ProcessedAttachment[]> {
  const processedAttachments: ProcessedAttachment[] = [];

  for (const attachment of attachments) {
    console.log(`\n=== Processing attachment: ${attachment.filename} ===`);

    const processed = await processSingleAttachment(pet, attachment, emailContext);
    processedAttachments.push(processed);
  }

  return processedAttachments;
}

/**
 * Process a single attachment through the full pipeline:
 * classify -> validate pet (microchip or attributes) -> upload -> OCR -> save to DB
 */
async function processSingleAttachment(
  pet: Pet,
  attachment: ParsedAttachment,
  emailContext: EmailContext
): Promise<ProcessedAttachment> {
  try {
    // Step 1: Classify attachment with Gemini AI
    const classification = await classifyAttachment(
      attachment,
      emailContext.subject,
      emailContext.textBody
    );

    console.log(
      `Classification result: ${classification.type} (confidence: ${classification.confidence})`
    );

    // Step 2: Skip irrelevant attachments
    if (classification.type === "irrelevant") {
      console.log(`Skipping irrelevant attachment: ${attachment.filename}`);
      return buildSkippedAttachment(attachment, classification);
    }

    // Step 3: Validate pet from document (microchip or attributes)
    const petValidation = await validatePetFromDocument(
      attachment,
      emailContext.subject,
      pet
    );

    console.log(formatValidationResult(petValidation));

    // Step 3a: Skip if validation failed
    if (!petValidation.isValid) {
      console.log(
        `Skipping attachment ${attachment.filename}: ${petValidation.skipReason}`
      );
      return buildValidationSkippedAttachment(
        attachment,
        classification,
        petValidation
      );
    }

    console.log(
      `Pet validated via ${petValidation.method}: proceeding with processing`
    );

    // Step 4: Upload to Supabase Storage
    const uploadResult = await uploadToStorage(pet, attachment, classification);
    if (!uploadResult.success) {
      return buildFailedAttachment(
        attachment,
        classification,
        uploadResult.error!,
        petValidation
      );
    }

    const storagePath = uploadResult.storagePath!;

    // Step 5: Trigger OCR
    const ocrResult = await runOCR(classification.type, storagePath);

    // Step 6: Save to database if OCR was successful
    const dbResult = ocrResult.success && ocrResult.data
      ? await saveToDatabase(classification.type, pet, storagePath, ocrResult.data)
      : { success: false, recordIds: undefined };

    // Build final result
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
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error(
      `Error processing attachment ${attachment.filename}:`,
      error
    );
    return buildErrorAttachment(attachment, errorMessage);
  }
}

/**
 * Upload attachment to Supabase Storage
 */
async function uploadToStorage(
  pet: Pet,
  attachment: ParsedAttachment,
  classification: DocumentClassification
): Promise<{ success: boolean; storagePath?: string; error?: string }> {
  try {
    const storagePath = await uploadAttachment(
      pet,
      classification.type,
      attachment.filename,
      attachment.content,
      attachment.mimeType
    );
    console.log(`Upload successful: ${storagePath}`);
    return { success: true, storagePath };
  } catch (uploadError) {
    const errorMessage =
      uploadError instanceof Error ? uploadError.message : String(uploadError);
    console.error(`Upload failed for ${attachment.filename}:`, uploadError);
    return { success: false, error: `Upload failed: ${errorMessage}` };
  }
}

/**
 * Run OCR on uploaded attachment
 */
async function runOCR(
  documentType: string,
  storagePath: string
): Promise<{ success: boolean; data?: any; error?: string }> {
  try {
    const ocrResponse = await triggerOCR(documentType, "pets", storagePath);

    if (!ocrResponse.success) {
      console.error(`OCR failed: ${ocrResponse.error}`);
      return { success: false, error: ocrResponse.error };
    }

    console.log("OCR completed successfully");
    return { success: true, data: ocrResponse.data };
  } catch (ocrError) {
    console.error(`OCR trigger failed:`, ocrError);
    return {
      success: false,
      error: ocrError instanceof Error ? ocrError.message : String(ocrError),
    };
  }
}

/**
 * Save OCR results to database
 */
async function saveToDatabase(
  documentType: string,
  pet: Pet,
  storagePath: string,
  ocrResult: any
): Promise<{ success: boolean; recordIds?: string[] }> {
  try {
    const saveResult = await saveOCRResults(
      documentType,
      pet,
      storagePath,
      ocrResult
    );

    if (saveResult.success) {
      console.log(
        `DB insert successful: ${saveResult.recordIds?.length || 0} record(s) inserted`
      );
    } else {
      console.error(`DB insert failed: ${saveResult.error}`);
    }

    return {
      success: saveResult.success,
      recordIds: saveResult.recordIds,
    };
  } catch (dbError) {
    console.error(`DB save failed:`, dbError);
    return { success: false };
  }
}

/**
 * Build a skipped attachment result (irrelevant)
 */
function buildSkippedAttachment(
  attachment: ParsedAttachment,
  classification: DocumentClassification
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

/**
 * Build a failed attachment result (upload failed)
 */
function buildFailedAttachment(
  attachment: ParsedAttachment,
  classification: DocumentClassification,
  error: string,
  petValidation?: PetValidationResult
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

/**
 * Build a skipped attachment result due to pet validation failure
 */
function buildValidationSkippedAttachment(
  attachment: ParsedAttachment,
  classification: DocumentClassification,
  petValidation: PetValidationResult
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

/**
 * Build an error attachment result (processing exception)
 */
function buildErrorAttachment(
  attachment: ParsedAttachment,
  error: string
): ProcessedAttachment {
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

