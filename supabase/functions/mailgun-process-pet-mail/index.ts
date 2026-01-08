// Follow this setup guide to integrate the Deno language server with your editor:
// https://deno.land/manual/getting_started/setup_your_environment
// This enables autocomplete, go to definition, etc.

// Setup type definitions for built-in Supabase Runtime APIs
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import {
  buildErrorResponse,
  buildNotFoundResponse,
  buildSuccessResponse,
  buildUnauthorizedResponse,
  buildValidationErrorResponse,
  logProcessingSummary,
  processAttachments,
  sendFailedNotification,
  sendProcessedNotification,
  sendSkippedAttachmentsNotification,
  verifySender,
} from "./handlers/index.ts";
import {
  markEmailAsCompleted,
  tryAcquireProcessingLock,
} from "./idempotencyChecker.ts";
import { extractMessageId, parseMailgunWebhook } from "./mailgunParser.ts";
import {
  extractSignatureFields,
  verifyMailgunSignature,
} from "./mailgunValidator.ts";
import { findPetByEmail } from "./petLookup.ts";
import type { EmailContext, EmailInfo, MailgunConfig, Pet } from "./types.ts";

console.log("mailgun-process-pet-mail function initialized");

Deno.serve(async (req) => {
  let pet: Pet | null = null;
  let senderEmail: string | null = null;

  try {
    // Step 1: Parse multipart/form-data from Mailgun
    const formData = await req.formData();

    // Step 2: Verify Mailgun webhook signature
    const signatureFields = extractSignatureFields(formData);
    if (!signatureFields) {
      return buildValidationErrorResponse(
        "Missing signature fields (timestamp, token, signature)"
      );
    }

    const mailgunSecret = Deno.env.get("MAILGUN_SECRET");
    if (!mailgunSecret) {
      console.error("MAILGUN_SECRET environment variable not configured");
      return buildErrorResponse("Server configuration error");
    }

    const isValidSignature = await verifyMailgunSignature(
      signatureFields.timestamp,
      signatureFields.token,
      signatureFields.signature,
      mailgunSecret
    );

    if (!isValidSignature) {
      console.error("Invalid Mailgun signature - rejecting request");
      return buildUnauthorizedResponse("Invalid webhook signature");
    }

    console.log("Mailgun signature verified successfully");

    // Step 3: Parse email from Mailgun webhook data
    const parsedEmail = await parseMailgunWebhook(formData);

    logParsedEmail(parsedEmail);

    // Step 4: Validate email has recipient
    if (!parsedEmail.to || parsedEmail.to.length === 0) {
      return buildValidationErrorResponse(
        "No recipient email found in parsed email"
      );
    }

    // Step 5: Find pet by recipient email
    const recipientEmail = parsedEmail.to[0].address;
    console.log(`Looking up pet by email: ${recipientEmail}`);

    pet = await findPetByEmail(recipientEmail);
    if (!pet) {
      return buildNotFoundResponse(
        `No pet found with email address: ${recipientEmail}`
      );
    }

    console.log(`Found pet: ${pet.name} (ID: ${pet.id})`);

    // Step 6: Validate sender email
    senderEmail = parsedEmail.from?.address ?? null;
    if (!senderEmail) {
      return buildValidationErrorResponse(
        "No sender email found in parsed email"
      );
    }

    // Step 7: Verify sender (check whitelist/blocklist)
    const emailInfo: EmailInfo = {
      from: senderEmail,
      subject: parsedEmail.subject,
      date: parsedEmail.date,
    };

    const messageId = extractMessageId(parsedEmail);
    if (!messageId) {
      return buildValidationErrorResponse(
        "No Message-Id found in email headers"
      );
    }

    const mailgunConfig: MailgunConfig = { messageId };

    const senderVerification = await verifySender(
      pet,
      senderEmail,
      mailgunConfig,
      emailInfo
    );

    if (!senderVerification.canProceed) {
      return senderVerification.response!;
    }

    // Step 8: Acquire processing lock (idempotency)
    // This is done AFTER sender verification so pending approvals don't acquire a lock
    // allowing reprocessing when user approves the email from the app
    const lockResult = await tryAcquireProcessingLock(messageId);
    if (!lockResult.acquired) {
      const message =
        lockResult.status === "completed"
          ? "Email already processed"
          : "Email is currently being processed";

      console.log(`${message}: ${messageId} - skipping`);
      return new Response(
        JSON.stringify({
          success: true,
          message,
          status: lockResult.status,
          messageId,
        }),
        {
          status: 200,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    // Step 9: Check for attachments
    if (!parsedEmail.attachments || parsedEmail.attachments.length === 0) {
      console.log("No attachments to process", pet, emailInfo);
      return buildSuccessResponse(
        pet,
        emailInfo,
        [],
        "No attachments to process"
      );
    }

    // Step 10: Process all attachments
    const emailContext: EmailContext = {
      subject: parsedEmail.subject,
      textBody: parsedEmail.textBody,
    };

    const processedAttachments = await processAttachments(
      pet,
      parsedEmail.attachments,
      emailContext
    );

    // Step 11: Log summary and return success
    logProcessingSummary(processedAttachments);

    // Step 12: Mark email as completed (idempotency)
    await markEmailAsCompleted(
      messageId,
      pet.id,
      processedAttachments.length,
      true
    );

    // Step 13: Check for skipped attachments due to pet validation failure
    const skippedAttachments = processedAttachments.filter(
      (a) =>
        a.skippedReason === "no_pet_info" ||
        a.skippedReason === "microchip_mismatch" ||
        a.skippedReason === "attributes_mismatch"
    );

    // Step 14: Send notifications
    // Send skipped notification if any attachments were skipped due to pet validation failure
    if (skippedAttachments.length > 0) {
      await sendSkippedAttachmentsNotification(
        pet,
        emailInfo,
        skippedAttachments
      );
    }

    // Send processed notification if records were successfully added
    await sendProcessedNotification(pet, emailInfo, processedAttachments);

    return buildSuccessResponse(pet, emailInfo, processedAttachments);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error("Error processing Mailgun webhook:", error);

    // Send failure notification if we have pet and sender info
    if (pet && senderEmail) {
      await sendFailedNotification(pet, senderEmail);
    }

    return buildErrorResponse(errorMessage);
  }
});

/**
 * Log parsed email details
 */
function logParsedEmail(parsedEmail: {
  from: { address: string } | null;
  to: { address: string }[];
  subject: string;
  attachments: unknown[];
}): void {
  console.log("Email parsed:", {
    from: parsedEmail.from?.address,
    to: parsedEmail.to.map((t) => t.address),
    subject: parsedEmail.subject,
    attachmentCount: parsedEmail.attachments.length,
  });
}

/* To invoke locally:

  1. Run `supabase start` (see: https://supabase.com/docs/reference/cli/supabase-start)
  2. Make an HTTP request:

  curl -i --location --request POST 'http://127.0.0.1:54321/functions/v1/mailgun-process-pet-mail' \
    --header 'Content-Type: multipart/form-data' \
    --form 'timestamp=1234567890' \
    --form 'token=abc123' \
    --form 'signature=computed_hmac_sha256' \
    --form 'sender=vet@clinic.com' \
    --form 'recipient=fluffy123@pets.pawbuck.com' \
    --form 'subject=Lab Results' \
    --form 'body-plain=See attached results' \
    --form 'Message-Id=<unique@mailgun.com>' \
    --form 'attachment-1=@/path/to/file.pdf'

*/
