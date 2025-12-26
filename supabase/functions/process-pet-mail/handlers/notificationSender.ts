import { sendNotificationToUser } from "../../_shared/notification.ts";
import type { EmailInfo, Pet, ProcessedAttachment } from "../types.ts";

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
