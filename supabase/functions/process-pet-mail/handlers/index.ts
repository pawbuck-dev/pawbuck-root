// Re-export all handlers for convenience
export { processAttachments } from "./attachmentProcessor.ts";
export { sendFailedNotification, sendProcessedNotification } from "./notificationSender.ts";
export {
  buildBlockedResponse,
  buildErrorResponse,
  buildNotFoundResponse,
  buildPendingApprovalResponse,
  buildSuccessResponse,
  buildValidationErrorResponse,
  logProcessingSummary
} from "./responseBuilder.ts";
export { verifySender } from "./senderVerification.ts";

