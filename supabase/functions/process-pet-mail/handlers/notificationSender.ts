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
 * Send a single combined notification when both records were added and some attachments were skipped.
 * Prevents the user from getting two separate notifications for one email.
 */
export async function sendCombinedProcessedAndSkippedNotification(
  pet: Pet,
  emailInfo: EmailInfo,
  processedAttachments: ProcessedAttachment[],
  skippedAttachments: ProcessedAttachment[]
): Promise<void> {
  const successfulRecords = processedAttachments.filter((a) => a.dbInserted);
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
  const skippedCount = skippedAttachments.length;
  const skippedWord = skippedCount === 1 ? "document was" : "documents were";

  const body =
    skippedCount > 0
      ? `${documentCount} new ${documentTypesText} ${recordWord} been added for ${pet.name} from ${emailInfo.from}. ${skippedCount} ${skippedWord} skipped due to validation — check the app for details.`
      : `${documentCount} new ${documentTypesText} ${recordWord} been added for ${pet.name} from ${emailInfo.from}`;

  try {
    await sendNotificationToUser(pet.user_id, {
      title: `New Health Records for ${pet.name}`,
      body,
      data: {
        type: "email_processed",
        petId: pet.id,
        petName: pet.name,
        recordTypes: [
          ...new Set(successfulRecords.map((a) => a.classification.type)),
        ],
        skippedCount,
      },
    });
    console.log(`Combined processed+skipped notification sent to user ${pet.user_id}`);
  } catch (notificationError) {
    console.error("Failed to send combined notification:", notificationError);
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
 * Format skip reason for display
 */
function formatSkipReason(reason?: SkipReason): string {
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
