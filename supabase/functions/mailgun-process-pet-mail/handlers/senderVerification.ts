import { sendNotificationToUser } from "../../_shared/notification.ts";
import {
  checkIsCareTeamEmail,
  checkSenderEmailStatus,
  savePendingApproval,
} from "../emailListChecker.ts";
import { storeEmailForApproval } from "../emailStorage.ts";
import type {
  EmailInfo,
  MailgunConfig,
  ParsedEmail,
  Pet,
  PetInfo,
  SenderVerificationResult,
} from "../types.ts";
import {
  buildBlockedResponse,
  buildPendingApprovalResponse,
} from "./responseBuilder.ts";

/**
 * Verify sender email status and handle blocked/unknown senders
 * Priority: 1) Care team (auto-verified), 2) Safe sender list, 3) Unknown (requires approval)
 * @param pet - The pet record
 * @param senderEmail - The sender's email address
 * @param mailgunConfig - Mailgun-specific configuration (messageId)
 * @param emailInfo - Basic email info for responses
 * @param parsedEmail - The full parsed email data (stored for later re-processing if unknown sender)
 * @returns SenderVerificationResult - canProceed: true if verified, false with response otherwise
 */
export async function verifySender(
  pet: Pet,
  senderEmail: string,
  mailgunConfig: MailgunConfig,
  emailInfo: EmailInfo,
  parsedEmail: ParsedEmail
): Promise<SenderVerificationResult> {
  console.log(`Verifying sender email: ${senderEmail}`);

  const petInfo: PetInfo = { id: pet.id, name: pet.name };

  // 1. First check if sender is a care team member (vet) - auto-verified
  const careTeamCheck = await checkIsCareTeamEmail(pet.id, senderEmail);
  if (careTeamCheck.isCareTeam) {
    console.log(
      `Sender ${senderEmail} is a care team member (${careTeamCheck.name}) - proceeding with processing`
    );
    return { canProceed: true };
  }

  // 2. Check safe sender list status
  const senderStatus = await checkSenderEmailStatus(pet.id, senderEmail);

  // Handle blocked sender
  if (senderStatus === "blocked") {
    console.log(`Sender ${senderEmail} is blocked - skipping processing`);
    return {
      canProceed: false,
      response: buildBlockedResponse(petInfo, emailInfo, senderEmail),
    };
  }

  // Handle whitelisted sender
  if (senderStatus === "whitelisted") {
    console.log(
      `Sender ${senderEmail} is whitelisted - proceeding with processing`
    );
    return { canProceed: true };
  }

  // 3. Handle unknown sender - requires user approval
  console.log(`Sender ${senderEmail} is unknown - saving for user approval`);

  const response = await handleUnknownSender(
    pet,
    senderEmail,
    mailgunConfig,
    emailInfo,
    parsedEmail
  );

  return {
    canProceed: false,
    response,
  };
}

/**
 * Handle unknown sender - store email data, save pending approval and send notification
 * Only sends notification if this is a new approval (not a duplicate/retry)
 */
async function handleUnknownSender(
  pet: Pet,
  senderEmail: string,
  mailgunConfig: MailgunConfig,
  emailInfo: EmailInfo,
  parsedEmail: ParsedEmail
): Promise<Response> {
  // Store the parsed email data to Supabase Storage for later re-processing
  // This is necessary because Mailgun doesn't store emails like SES/S3
  console.log(
    `Storing email data for later re-processing: ${mailgunConfig.messageId}`
  );
  const storedEmailPath = await storeEmailForApproval(
    mailgunConfig.messageId,
    parsedEmail
  );
  console.log(`Email stored at: ${storedEmailPath}`);

  // Save to pending_email_approvals (returns existing if duplicate)
  // Use the storage path as the fileKey so it can be retrieved later
  const { id: pendingApprovalId, isNew } = await savePendingApproval(
    pet,
    senderEmail,
    { bucket: "pending-emails", fileKey: storedEmailPath }
  );

  // Only send notification if this is a NEW approval (not a retry/duplicate)
  if (isNew) {
    await sendApprovalNotification(pet, senderEmail, pendingApprovalId);
  } else {
    console.log(
      `Skipping notification - duplicate request for existing approval: ${pendingApprovalId}`
    );
  }

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
