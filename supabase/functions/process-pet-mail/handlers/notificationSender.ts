import { sendNotificationToUser } from "../../_shared/notification.ts";
import type {
  EmailInfo,
  Pet,
  PetValidationResult,
  ProcessedAttachment,
  SkipReason,
} from "../types.ts";

/**
 * Notify owner that ICS from pet email created pending vet bookings to confirm in-app.
 */
export async function sendCalendarImportsPendingNotification(
  pet: Pet,
  importCount: number
): Promise<void> {
  if (importCount <= 0) return;

  try {
    await sendNotificationToUser(pet.user_id, {
      title:
        importCount === 1
          ? `Confirm appointment for ${pet.name}`
          : `Confirm ${importCount} appointments for ${pet.name}`,
      body:
        "We imported a calendar invite from email. Open Calendar in the app to confirm the time.",
      data: {
        type: "vet_booking_import_pending",
        petId: pet.id,
        petName: pet.name,
        count: String(importCount),
      },
    });
    console.log(`Calendar import pending notification sent to user ${pet.user_id}`);
  } catch (notificationError) {
    console.error("Failed to send calendar import notification:", notificationError);
  }
}

/**
 * Notify owner that email health-document parsing requires Individual plan.
 */
export async function sendEmailParsingUpgradeNotification(
  pet: Pet,
  attachmentCount: number
): Promise<void> {
  if (attachmentCount <= 0) return;

  const fileWord = attachmentCount === 1 ? "document" : "documents";

  try {
    await sendNotificationToUser(pet.user_id, {
      title: `Upgrade to import records for ${pet.name}`,
      body:
        `We received ${attachmentCount} health ${fileWord} by email. Email parsing is included with Individual — upgrade in the app to import them automatically.`,
      data: {
        type: "email_parsing_upgrade_required",
        petId: pet.id,
        petName: pet.name,
        attachmentCount,
      },
    });
    console.log(`Email parsing upgrade notification sent to user ${pet.user_id}`);
  } catch (notificationError) {
    console.error("Failed to send email parsing upgrade notification:", notificationError);
  }
}

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
 * Inform the owner that the document microchip differs from the profile.
 * Non-blocking: processing may still continue when first name + breed match.
 */
export async function sendMicrochipMismatchNotification(
  pet: Pet,
  validation: PetValidationResult,
  filename?: string
): Promise<void> {
  if (!validation.microchipMismatchNotify) {
    return;
  }

  const docChip = validation.microchipDocumentValue ?? validation.extractedInfo.microchip ?? "";
  const profileChip = validation.microchipProfileValue ?? pet.microchip_number ?? "";
  const fileHint = filename ? ` (${filename})` : "";

  try {
    await sendNotificationToUser(pet.user_id, {
      title: `Microchip mismatch for ${pet.name}`,
      body:
        `The document shows a different microchip than ${pet.name}'s profile. ` +
        `We still processed the email using name and breed verification.${fileHint}`,
      data: {
        type: "email_microchip_mismatch",
        petId: pet.id,
        petName: pet.name,
        documentMicrochip: docChip,
        profileMicrochip: profileChip,
        filename: filename ?? null,
      },
    });
    console.log(`Microchip mismatch notification sent to user ${pet.user_id}`);
  } catch (notificationError) {
    console.error("Failed to send microchip mismatch notification:", notificationError);
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
 * Format skip reason for display
 */
function formatSkipReason(reason?: SkipReason): string {
  switch (reason) {
    case "no_pet_info":
      return "No pet identification info found";
    case "microchip_mismatch":
      return "Microchip number does not match (legacy)";
    case "attributes_mismatch":
      return "Pet first name or breed does not match profile";
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
