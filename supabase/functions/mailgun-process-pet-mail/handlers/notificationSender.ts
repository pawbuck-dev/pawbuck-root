import { sendNotificationToUser } from "../../_shared/notification.ts";
import type { EmailInfo, Pet, ProcessedAttachment, SkipReason } from "../types.ts";

/**
 * Send push notification after successful email processing
 */
export async function sendProcessedNotification(
  pet: Pet,
  emailInfo: EmailInfo,
  processedAttachments: ProcessedAttachment[]
): Promise<void> {
  // Count successfully inserted records
  const successfulRecords = processedAttachments.filter((a) => a.dbInserted);

  if (successfulRecords.length === 0) {
    console.log("No records were inserted - skipping notification");
    return;
  }

  // Get unique document types from successful records
  const documentTypes = [
    ...new Set(
      successfulRecords.map((a) => formatDocumentType(a.classification.type))
    ),
  ];

  const documentCount = successfulRecords.reduce(
    (count, a) => count + (a.dbRecordIds?.length || 1),
    0
  );

  const documentTypesText = documentTypes.join(", ");
  const recordWord = documentCount === 1 ? "record has" : "records have";

  try {
    await sendNotificationToUser(pet.user_id, {
      title: `New Health Records Added for ${pet.name}`,
      body: `${documentCount} new ${documentTypesText} ${recordWord} been added for ${pet.name} from ${emailInfo.from}`,
      data: {
        type: "email_processed",
        petId: pet.id,
        petName: pet.name,
        recordTypes: [
          ...new Set(successfulRecords.map((a) => a.classification.type)),
        ],
      },
    });
    console.log(`Processing notification sent to user ${pet.user_id}`);
  } catch (notificationError) {
    console.error("Failed to send processing notification:", notificationError);
    // Continue even if notification fails - the processing was still successful
  }
}

/**
 * Send push notification when email processing fails
 */
export async function sendFailedNotification(
  pet: Pet,
  senderEmail: string
): Promise<void> {
  try {
    await sendNotificationToUser(pet.user_id, {
      title: `Email Processing Failed for ${pet.name}`,
      body: `Failed to process email from ${senderEmail} for ${pet.name}`,
      data: {
        type: "email_failed",
        petId: pet.id,
        petName: pet.name,
        senderEmail,
      },
    });
    console.log(`Failed notification sent to user ${pet.user_id}`);
  } catch (notificationError) {
    console.error("Failed to send error notification:", notificationError);
    // Continue even if notification fails
  }
}

/**
 * Send push notification when attachments are skipped due to pet validation failure
 */
export async function sendSkippedAttachmentsNotification(
  pet: Pet,
  emailInfo: EmailInfo,
  skippedAttachments: ProcessedAttachment[]
): Promise<void> {
  if (skippedAttachments.length === 0) {
    return;
  }

  // Build details about skipped attachments
  const skippedDetails = skippedAttachments.map((att) => {
    const reason = formatSkipReason(att.skippedReason);
    const validation = att.petValidation;
    
    if (validation) {
      const extracted = validation.extractedInfo;
      const details: string[] = [];
      
      if (extracted.microchip) {
        details.push(`microchip: ${extracted.microchip}`);
      }
      if (extracted.name) {
        details.push(`name: ${extracted.name}`);
      }
      if (extracted.breed) {
        details.push(`breed: ${extracted.breed}`);
      }
      
      if (details.length > 0) {
        return `${att.filename}: ${reason} (found: ${details.join(", ")})`;
      }
    }
    return `${att.filename}: ${reason}`;
  });

  const skippedCount = skippedAttachments.length;
  const fileWord = skippedCount === 1 ? "document was" : "documents were";

  try {
    await sendNotificationToUser(pet.user_id, {
      title: `Documents Skipped for ${pet.name}`,
      body: `${skippedCount} ${fileWord} skipped because the pet could not be verified. Please check the email from ${emailInfo.from}.`,
      data: {
        type: "email_skipped",
        petId: pet.id,
        petName: pet.name,
        skippedCount,
        skippedDetails,
        senderEmail: emailInfo.from,
      },
    });
    console.log(`Skipped attachments notification sent to user ${pet.user_id}`);
  } catch (notificationError) {
    console.error("Failed to send skipped notification:", notificationError);
    // Continue even if notification fails
  }
}

/**
 * Send push notification when attachments fail to process
 * This handles all failure types: validation, OCR, and DB insert failures
 */
export async function sendAttachmentFailureNotification(
  pet: Pet,
  emailInfo: EmailInfo,
  failedAttachments: ProcessedAttachment[]
): Promise<void> {
  if (failedAttachments.length === 0) {
    return;
  }

  const failedCount = failedAttachments.length;
  const fileWord = failedCount === 1 ? "document" : "documents";

  // Build failure details for each attachment
  const failureDetails = failedAttachments.map((att) => {
    let reason: string;
    if (att.skippedReason === "no_pet_info") {
      reason = "No pet identification found";
    } else if (att.skippedReason === "microchip_mismatch") {
      reason = "Microchip mismatch";
    } else if (att.skippedReason === "attributes_mismatch") {
      reason = "Pet details mismatch";
    } else if (att.error) {
      reason = att.error;
    } else if (att.ocrSuccess === false) {
      reason = "Failed to extract data";
    } else {
      reason = "Failed to save record";
    }
    return `${att.filename}: ${reason}`;
  });

  try {
    await sendNotificationToUser(pet.user_id, {
      title: `Failed to Process ${failedCount} ${fileWord} for ${pet.name}`,
      body: `We received ${failedCount} ${fileWord} from ${emailInfo.from} but couldn't add them to ${pet.name}'s health records.`,
      data: {
        type: "email_attachment_failed",
        petId: pet.id,
        petName: pet.name,
        failedCount,
        failureDetails,
        senderEmail: emailInfo.from,
      },
    });
    console.log(`Attachment failure notification sent to user ${pet.user_id}`);
  } catch (notificationError) {
    console.error(
      "Failed to send attachment failure notification:",
      notificationError
    );
    // Continue even if notification fails
  }
}

/**
 * Format skip reason for display
 */
export function formatSkipReason(reason?: SkipReason): string {
  switch (reason) {
    case "no_pet_info":
      return "No pet identification info found";
    case "microchip_mismatch":
      return "Microchip number does not match";
    case "attributes_mismatch":
      return "Pet details (name/age/breed/gender) do not match";
    default:
      return "Validation failed";
  }
}

/**
 * Format document type for display in notification
 */
function formatDocumentType(type: string): string {
  const typeMap: Record<string, string> = {
    medications: "medication",
    lab_results: "lab result",
    clinical_exams: "clinical exam",
    vaccinations: "vaccination",
  };
  return typeMap[type] || type;
}

