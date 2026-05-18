import { processHealthAttachments } from "../../_shared/email-health-ingestion/processHealthAttachments.ts";
import { sendMicrochipMismatchNotification } from "./notificationSender.ts";
import type { EmailContext, ParsedAttachment, Pet, ProcessedAttachment } from "../types.ts";

/**
 * Process health-document attachments (vault pipeline by default).
 */
export async function processAttachments(
  pet: Pet,
  attachments: ParsedAttachment[],
  emailContext: EmailContext,
): Promise<ProcessedAttachment[]> {
  return processHealthAttachments(pet, attachments, emailContext, {
    ingestionSource: "email_ses",
    onMicrochipMismatch: sendMicrochipMismatchNotification,
  });
}
