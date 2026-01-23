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
  formatSkipReason,
  logProcessingSummary,
  processAttachments,
  sendAttachmentFailureNotification,
  sendFailedNotification,
  sendProcessedNotification,
  verifySender,
} from "./handlers/index.ts";
import {
  markEmailAsCompleted,
  markEmailAsFailed,
  tryAcquireProcessingLock,
} from "./idempotencyChecker.ts";
import { extractMessageId, parseMailgunWebhook } from "./mailgunParser.ts";
import {
  extractSignatureFields,
  verifyMailgunSignature,
} from "./mailgunValidator.ts";
import {
  deleteStoredEmail,
  retrieveEmailForReprocessing,
} from "./emailStorage.ts";
import { storeInboundMessage } from "./messageStorage.ts";
import { findPetByEmail } from "./petLookup.ts";
import { lookupRecipientName } from "./recipientNameLookup.ts";
import { createThreadFromInboundEmail } from "./threadCreation.ts";
import { findThreadByRecipientAndPet } from "./threadLookup.ts";
import type {
  EmailContext,
  EmailInfo,
  MailgunConfig,
  ParsedEmail,
  Pet,
} from "./types.ts";

console.log("mailgun-process-pet-mail function initialized");

Deno.serve(async (req) => {
  let pet: Pet | null = null;
  let senderEmail: string | null = null;
  let messageId: string | null = null;
  let isReprocessing = false;
  let storedEmailPath: string | null = null;

  try {
    // Detect request type based on content-type header
    const contentType = req.headers.get("content-type") || "";
    let parsedEmail: ParsedEmail;

    if (contentType.includes("application/json")) {
      // Re-processing request after user approval
      console.log("Detected re-processing request (JSON body)");
      isReprocessing = true;

      const body = await req.json();
      const { fileKey } = body as { bucket?: string; fileKey?: string };

      if (!fileKey) {
        return buildValidationErrorResponse(
          "Missing required parameter: fileKey"
        );
      }

      console.log(`Re-processing email with fileKey: ${fileKey}`);
      storedEmailPath = fileKey;

      // Retrieve stored email data from Supabase Storage
      parsedEmail = await retrieveEmailForReprocessing(fileKey);
      console.log("Successfully retrieved stored email for re-processing");
    } else {
      // Original Mailgun webhook (multipart/form-data)
      console.log("Detected Mailgun webhook request (form-data)");

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
      parsedEmail = await parseMailgunWebhook(formData);
    }

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

    messageId = extractMessageId(parsedEmail);
    if (!messageId) {
      return buildValidationErrorResponse(
        "No Message-Id found in email headers"
      );
    }

    const mailgunConfig: MailgunConfig = { messageId };

    // Skip sender verification for re-processing (sender was already approved)
    if (!isReprocessing) {
      const senderVerification = await verifySender(
        pet,
        senderEmail,
        mailgunConfig,
        emailInfo,
        parsedEmail
      );

      if (!senderVerification.canProceed) {
        return senderVerification.response!;
      }
    } else {
      console.log(
        `Skipping sender verification for re-processing (sender already approved): ${senderEmail}`
      );
    }

    // Step 8: Acquire processing lock (idempotency)
    // This is done AFTER sender verification so pending approvals don't acquire a lock
    // allowing reprocessing when user approves the email from the app
    const lockResult = await tryAcquireProcessingLock(messageId, {
      senderEmail: senderEmail,
      subject: parsedEmail.subject,
    });
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

    // Step 8.5: Store inbound message if it has text content and we can find a thread
    // The recipient email in the "To" field is the reply-to address from our outbound emails
    const messageStorageStartTime = Date.now();
    let messageStored = false;

    // Log email details for debugging
    console.log(
      `[MONITORING] Email details - To: ${recipientEmail}, From: ${senderEmail}, Subject: ${parsedEmail.subject}`
    );
    console.log(
      `[MONITORING] Text body length: ${parsedEmail.textBody?.length || 0}, Has attachments: ${parsedEmail.attachments?.length || 0}`
    );

    if (parsedEmail.textBody && parsedEmail.textBody.trim().length > 0) {
      console.log(
        `[MONITORING] Starting message storage (text body length: ${parsedEmail.textBody.length})`
      );
      try {
        const thread = await findThreadByRecipientAndPet(senderEmail, pet.id);

        if (thread) {
          console.log(
            `[MONITORING] ✅ Thread found: ${thread.threadId} (subject: ${thread.subject}, recipient: ${thread.recipientEmail})`
          );
          console.log(
            `[MONITORING] Storing message in thread ${thread.threadId}...`
          );

          await storeInboundMessage({
            threadId: thread.threadId,
            senderEmail: senderEmail,
            recipientEmail: recipientEmail,
            cc: parsedEmail.cc?.map((c) => c.address) || null,
            bcc: null, // BCC is typically not in received emails
            subject: parsedEmail.subject,
            body: parsedEmail.textBody, // Already cleaned by mailgunParser
            sentAt: parsedEmail.date || undefined,
            messageId: messageId, // For email threading support
          });

          messageStored = true;
          const messageStorageDuration = Date.now() - messageStorageStartTime;
          console.log(
            `[MONITORING] ✅ Successfully stored inbound message for thread ${thread.threadId} from ${senderEmail} (${messageStorageDuration}ms)`
          );
        } else {
          // No thread found - this is a new conversation starting with an inbound email
          // Since the sender is whitelisted (we've passed verification), create a new thread
          console.log(
            `[MONITORING] ⚠️ No thread found for reply-to address "${recipientEmail}" or sender "${senderEmail}" with pet ${pet.id}`
          );
          console.log(
            `[MONITORING] Creating new thread for incoming conversation (sender is whitelisted)...`
          );

          try {
            // Get recipient name from care team if available
            const senderName = await lookupRecipientName(senderEmail);

            // Create new thread
            const newThread = await createThreadFromInboundEmail({
              userId: pet.user_id,
              petId: pet.id,
              recipientEmail: senderEmail, // The sender becomes the recipient in the thread
              recipientName: senderName,
              subject: parsedEmail.subject,
              petEmail: recipientEmail,
              messageId: messageId, // For email threading support
            });

            console.log(
              `[MONITORING] ✅ Created new thread: ${newThread.threadId}`
            );

            // Store the message in the new thread
            await storeInboundMessage({
              threadId: newThread.threadId,
              senderEmail: senderEmail,
              recipientEmail: recipientEmail, // This is the pet's email (not used in this context)
              cc: parsedEmail.cc?.map((c) => c.address) || null,
              bcc: null,
              subject: parsedEmail.subject,
              body: parsedEmail.textBody,
              sentAt: parsedEmail.date || undefined,
              messageId: messageId, // For email threading support
            });

            messageStored = true;
            const messageStorageDuration = Date.now() - messageStorageStartTime;
            console.log(
              `[MONITORING] ✅ Successfully created thread and stored inbound message for thread ${newThread.threadId} from ${senderEmail} (${messageStorageDuration}ms)`
            );
          } catch (createError) {
            const messageStorageDuration = Date.now() - messageStorageStartTime;
            console.error(
              `[MONITORING] ❌ Error creating thread for new conversation (${messageStorageDuration}ms):`,
              createError
            );
            if (createError instanceof Error) {
              console.error(
                `[MONITORING] Error message: ${createError.message}`
              );
              console.error(`[MONITORING] Error stack: ${createError.stack}`);
            }
            // Don't fail the entire request - attachment processing can still proceed
          }
        }
      } catch (error) {
        const messageStorageDuration = Date.now() - messageStorageStartTime;
        console.error(
          `[MONITORING] ❌ Error storing inbound message (${messageStorageDuration}ms):`,
          error
        );
        if (error instanceof Error) {
          console.error(`[MONITORING] Error message: ${error.message}`);
          console.error(`[MONITORING] Error stack: ${error.stack}`);
        }
        // Don't fail the entire request if message storage fails
      }
    } else {
      console.log(
        `[MONITORING] No text body to store (textBody length: ${parsedEmail.textBody?.length || 0})`
      );
    }

    // Step 10: Check for attachments
    if (!parsedEmail.attachments || parsedEmail.attachments.length === 0) {
      console.log("[MONITORING] No attachments to process", pet, emailInfo);

      // Mark email as completed even if there are no attachments
      // (lock was acquired, so we need to release it)
      console.log(
        `[MONITORING] Marking email as completed (no attachments, message stored: ${messageStored})`
      );

      await markEmailAsCompleted(
        messageId,
        pet.id,
        0, // no attachments
        true // success
      );

      console.log(
        `[MONITORING] ✅ Email processing completed (no attachments)`
      );

      // Clean up stored email if this was a re-processing request
      if (isReprocessing && storedEmailPath) {
        await deleteStoredEmail(storedEmailPath);
      }

      return buildSuccessResponse(
        pet,
        emailInfo,
        [],
        "No attachments to process"
      );
    }

    // Step 11: Process all attachments
    const emailContext: EmailContext = {
      subject: parsedEmail.subject,
      textBody: parsedEmail.textBody,
    };

    const processedAttachments = await processAttachments(
      pet,
      parsedEmail.attachments,
      emailContext
    );

    // Step 12: Log summary and return success
    logProcessingSummary(processedAttachments);

    // Step 13: Check for attachment failures
    // Identify relevant attachments (excluding irrelevant classifications)
    const relevantAttachments = processedAttachments.filter(
      (a) => a.classification.type !== "irrelevant"
    );
    const successfulInserts = relevantAttachments.filter((a) => a.dbInserted);
    const failedAttachments = relevantAttachments.filter((a) => !a.dbInserted);

    // If we had relevant attachments but NONE were successfully inserted
    if (relevantAttachments.length > 0 && successfulInserts.length === 0) {
      console.log(
        `[MONITORING] All ${failedAttachments.length} relevant attachment(s) failed to process`
      );

      // Build failure reasons from ALL failed attachments (including validation failures)
      const failureReasons = failedAttachments.map((a) => {
        if (a.skippedReason) {
          return formatSkipReason(a.skippedReason);
        } else if (a.error) {
          return a.error;
        } else if (a.ocrSuccess === false) {
          return "Failed to extract data from document";
        }
        return "Failed to save to database";
      });

      // Mark as FAILED in processed_emails
      await markEmailAsCompleted(
        messageId,
        pet.id,
        processedAttachments.length,
        false,
        {
          documentType: relevantAttachments[0]?.classification.type,
          failureReason: `Failed to process ${failedAttachments.length} document(s): ${failureReasons.join("; ")}`,
        }
      );

      console.log(`[MONITORING] ❌ Email marked as failed - no records inserted`);

      // Send failure notification
      await sendAttachmentFailureNotification(pet, emailInfo, failedAttachments);

      // Clean up stored email if this was a re-processing request
      if (isReprocessing && storedEmailPath) {
        await deleteStoredEmail(storedEmailPath);
      }

      return buildSuccessResponse(pet, emailInfo, processedAttachments);
    }

    // Step 14: Mark email as completed successfully (at least some records were inserted)
    console.log(
      `[MONITORING] Marking email as completed (attachments: ${processedAttachments.length}, successful: ${successfulInserts.length}, message stored: ${messageStored})`
    );

    await markEmailAsCompleted(
      messageId,
      pet.id,
      processedAttachments.length,
      true
    );

    console.log(`[MONITORING] ✅ Email processing completed successfully`);

    // Step 15: Send success notification if records were successfully added
    await sendProcessedNotification(pet, emailInfo, processedAttachments);

    // Clean up stored email if this was a re-processing request
    if (isReprocessing && storedEmailPath) {
      await deleteStoredEmail(storedEmailPath);
    }

    return buildSuccessResponse(pet, emailInfo, processedAttachments);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error("Error processing Mailgun webhook:", error);

    // Mark email as failed if we have the messageId (lock was acquired)
    if (messageId) {
      await markEmailAsFailed(
        messageId,
        pet?.id ?? null,
        errorMessage
      );
    }

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
