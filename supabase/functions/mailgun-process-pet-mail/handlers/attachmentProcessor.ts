import {
  processHealthAttachments,
  type ProcessHealthAttachmentsOptions,
} from "../../_shared/email-health-ingestion/processHealthAttachments.ts";
import { sendMicrochipMismatchNotification } from "./notificationSender.ts";
import type { EmailContext, ParsedAttachment, Pet, ProcessedAttachment } from "../types.ts";

export type ProcessAttachmentsOptions = Pick<
  ProcessHealthAttachmentsOptions,
  "forcedDocumentType" | "forcedAttachmentIndexLimit" | "apiDocumentTypeOverride"
>;

export async function processAttachments(
  pet: Pet,
  attachments: ParsedAttachment[],
  emailContext: EmailContext,
  options?: ProcessAttachmentsOptions,
): Promise<ProcessedAttachment[]> {
  return processHealthAttachments(pet, attachments, emailContext, {
    ingestionSource: "email_mailgun",
    forcedDocumentType: options?.forcedDocumentType,
    forcedAttachmentIndexLimit: options?.forcedAttachmentIndexLimit,
    apiDocumentTypeOverride: options?.apiDocumentTypeOverride,
    onMicrochipMismatch: sendMicrochipMismatchNotification,
  });
}
