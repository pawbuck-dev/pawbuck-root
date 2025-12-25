import { sendNotificationToUser } from "../../_shared/notification.ts";
import {
  checkSenderEmailStatus,
  savePendingApproval,
} from "../emailListChecker.ts";
import type {
  EmailInfo,
  Pet,
  PetInfo,
  S3Config,
  SenderVerificationResult,
} from "../types.ts";
import {
  buildBlockedResponse,
  buildPendingApprovalResponse,
} from "./responseBuilder.ts";

/**
 * Verify sender email status and handle blocked/unknown senders
 * @returns SenderVerificationResult - canProceed: true if whitelisted, false with response otherwise
 */
export async function verifySender(
  pet: Pet,
  senderEmail: string,
  s3Config: S3Config,
  emailInfo: EmailInfo
): Promise<SenderVerificationResult> {
  console.log(`Checking sender email status: ${senderEmail}`);
  const senderStatus = await checkSenderEmailStatus(pet.id, senderEmail);

  const petInfo: PetInfo = { id: pet.id, name: pet.name };

  // Handle blocked sender
  if (senderStatus === "blocked") {
    console.log(`Sender ${senderEmail} is blocked - skipping processing`);
    return {
      canProceed: false,
      response: buildBlockedResponse(petInfo, emailInfo, senderEmail),
    };
  }

  // Handle unknown sender - requires user approval
  if (senderStatus === "unknown") {
    console.log(`Sender ${senderEmail} is unknown - saving for user approval`);

    const response = await handleUnknownSender(
      pet,
      senderEmail,
      s3Config,
      emailInfo
    );

    return {
      canProceed: false,
      response,
    };
  }

  // Sender is whitelisted - can proceed
  console.log(
    `Sender ${senderEmail} is whitelisted - proceeding with processing`
  );
  return { canProceed: true };
}

/**
 * Handle unknown sender - save pending approval and send notification
 */
async function handleUnknownSender(
  pet: Pet,
  senderEmail: string,
  s3Config: S3Config,
  emailInfo: EmailInfo
): Promise<Response> {
  // Save to pending_email_approvals
  const pendingApprovalId = await savePendingApproval(pet, senderEmail, s3Config);

  // Send notification to user
  await sendApprovalNotification(pet, senderEmail, pendingApprovalId);

  const petInfo: PetInfo = { id: pet.id, name: pet.name };
  return buildPendingApprovalResponse(
    petInfo,
    emailInfo,
    senderEmail,
    pendingApprovalId
  );
}

/**
 * Send push notification to user about pending email approval
 */
async function sendApprovalNotification(
  pet: Pet,
  senderEmail: string,
  pendingApprovalId: string
): Promise<void> {
  try {
    await sendNotificationToUser(pet.user_id, {
      title: "New Email Requires Approval",
      body: `Email from ${senderEmail} was sent for ${pet.name}. Tap to review and approve.`,
      data: {
        type: "email_approval",
        pendingApprovalId,
        petId: pet.id,
        petName: pet.name,
        senderEmail,
      },
    });
    console.log(`Notification sent to user ${pet.user_id}`);
  } catch (notificationError) {
    console.error("Failed to send notification:", notificationError);
    // Continue even if notification fails - the pending approval is still saved
  }
}

