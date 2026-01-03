// Follow this setup guide to integrate the Deno language server with your editor:
// https://deno.land/manual/getting_started/setup_your_environment
// This enables autocomplete, go to definition, etc.

// Setup type definitions for built-in Supabase Runtime APIs
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { parseEmail } from "./emailParser.ts";
import {
  buildErrorResponse,
  buildNotFoundResponse,
  buildSuccessResponse,
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
import { findPetByEmail } from "./petLookup.ts";
import { fetchEmailFromS3 } from "./s3Client.ts";
import {
  findThreadByReplyToAddress,
  findThreadByRecipientAndPet,
} from "./threadLookup.ts";
import { storeInboundMessage } from "./messageStorage.ts";
import { createThreadFromInboundEmail } from "./threadCreation.ts";
import { lookupRecipientName } from "./recipientNameLookup.ts";
import type { EmailContext, EmailInfo, Pet, S3Config } from "./types.ts";

console.log("process-pet-mail function initialized");

Deno.serve(async (req) => {
  const startTime = Date.now();
  let pet: Pet | null = null;
  let senderEmail: string | null = null;
  let s3Config: S3Config | null = null;

  try {
    // Step 1: Parse and validate request
    s3Config = await parseRequest(req);
    if (!s3Config) {
      return buildValidationErrorResponse(
        "Missing required parameters: bucket and fileKey"
      );
    }

    // Step 2: Fetch and parse email from S3
    const rawEmail = await fetchEmailFromS3(s3Config);
    const parsedEmail = await parseEmail(rawEmail);

    logParsedEmail(parsedEmail);

    // Step 3: Validate email has recipient
    if (!parsedEmail.to || parsedEmail.to.length === 0) {
      return buildValidationErrorResponse(
        "No recipient email found in parsed email"
      );
    }

    // Step 4: Find pet by recipient email
    const recipientEmail = parsedEmail.to[0].address;
    console.log(`Looking up pet by email: ${recipientEmail}`);

    pet = await findPetByEmail(recipientEmail);
    if (!pet) {
      return buildNotFoundResponse(
        `No pet found with email address: ${recipientEmail}`
      );
    }

    console.log(`Found pet: ${pet.name} (ID: ${pet.id})`);

    // Step 5: Validate sender email
    senderEmail = parsedEmail.from?.address ?? null;
    if (!senderEmail) {
      return buildValidationErrorResponse(
        "No sender email found in parsed email"
      );
    }

    // Step 6: Verify sender (check whitelist/blocklist)
    const emailInfo: EmailInfo = {
      from: senderEmail,
      subject: parsedEmail.subject,
      date: parsedEmail.date,
    };

    const senderVerification = await verifySender(
      pet,
      senderEmail,
      s3Config,
      emailInfo
    );

    if (!senderVerification.canProceed) {
      return senderVerification.response!;
    }

    // Step 7: Acquire processing lock (idempotency)
    // This is done AFTER sender verification so pending approvals don't acquire a lock
    // allowing reprocessing when user approves the email from the app
    const lockResult = await tryAcquireProcessingLock(s3Config.fileKey);
    if (!lockResult.acquired) {
      const message = lockResult.status === "completed"
        ? "Email already processed"
        : "Email is currently being processed";
      
      console.log(`${message}: ${s3Config.fileKey} - skipping`);
      return new Response(
        JSON.stringify({
          success: true,
          message,
          status: lockResult.status,
          s3Key: s3Config.fileKey,
        }),
        {
          status: 200,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    // Step 7.5: Store inbound message if it has text content and we can find a thread
    // The recipient email in the "To" field is the reply-to address from our outbound emails
    const messageStorageStartTime = Date.now();
    let messageStored = false;
    
    // Log email details for debugging
    console.log(`[MONITORING] Email details - To: ${recipientEmail}, From: ${senderEmail}, Subject: ${parsedEmail.subject}`);
    console.log(`[MONITORING] Text body length: ${parsedEmail.textBody?.length || 0}, Has attachments: ${parsedEmail.attachments?.length || 0}`);
    
    if (parsedEmail.textBody && parsedEmail.textBody.trim().length > 0) {
      console.log(`[MONITORING] Starting message storage (text body length: ${parsedEmail.textBody.length})`);
      try {
        // Try to find thread by reply-to address (recipient email)
        // When a vet replies, the "To" field contains our reply-to address (e.g., thread-abc123@pawbuck.app)
        console.log(`[MONITORING] Looking up thread by reply-to address: ${recipientEmail.toLowerCase()}`);
        let thread = await findThreadByReplyToAddress(recipientEmail);

        // Fallback: try to find thread by sender email + pet ID
        // The sender email (vet's email) should match the thread's recipient_email
        if (!thread) {
          console.log(`[MONITORING] Thread not found by reply-to, trying sender email + pet ID: ${senderEmail.toLowerCase()}, pet: ${pet.id}`);
          thread = await findThreadByRecipientAndPet(senderEmail, pet.id);
        }

        if (thread) {
          console.log(`[MONITORING] ✅ Thread found: ${thread.threadId} (subject: ${thread.subject}, recipient: ${thread.recipientEmail})`);
          console.log(`[MONITORING] Storing message in thread ${thread.threadId}...`);
          
          await storeInboundMessage({
            threadId: thread.threadId,
            senderEmail: senderEmail,
            recipientEmail: recipientEmail,
            cc: parsedEmail.cc?.map((c) => c.address) || null,
            bcc: null, // BCC is typically not in received emails
            subject: parsedEmail.subject,
            body: parsedEmail.textBody, // Already cleaned by emailParser
            sentAt: parsedEmail.date || undefined,
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
          console.log(`[MONITORING] Creating new thread for incoming conversation (sender is whitelisted)...`);
          
          try {
            // Get recipient name from care team if available
            const recipientName = await lookupRecipientName(senderEmail);
            
            // Create new thread
            const newThread = await createThreadFromInboundEmail({
              userId: pet.user_id,
              petId: pet.id,
              recipientEmail: senderEmail, // The sender becomes the recipient in the thread
              recipientName: recipientName,
              subject: parsedEmail.subject,
            });
            
            console.log(`[MONITORING] ✅ Created new thread: ${newThread.threadId}`);
            
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
            });
            
            messageStored = true;
            const messageStorageDuration = Date.now() - messageStorageStartTime;
            console.log(
              `[MONITORING] ✅ Successfully created thread and stored inbound message for thread ${newThread.threadId} from ${senderEmail} (${messageStorageDuration}ms)`
            );
          } catch (createError) {
            const messageStorageDuration = Date.now() - messageStorageStartTime;
            console.error(`[MONITORING] ❌ Error creating thread for new conversation (${messageStorageDuration}ms):`, createError);
            if (createError instanceof Error) {
              console.error(`[MONITORING] Error message: ${createError.message}`);
              console.error(`[MONITORING] Error stack: ${createError.stack}`);
            }
            // Don't fail the entire request - attachment processing can still proceed
          }
        }
      } catch (error) {
        const messageStorageDuration = Date.now() - messageStorageStartTime;
        console.error(`[MONITORING] ❌ Error storing inbound message (${messageStorageDuration}ms):`, error);
        if (error instanceof Error) {
          console.error(`[MONITORING] Error message: ${error.message}`);
          console.error(`[MONITORING] Error stack: ${error.stack}`);
        }
        // Don't fail the entire request if message storage fails
      }
    } else {
      console.log(`[MONITORING] No text body to store (textBody length: ${parsedEmail.textBody?.length || 0})`);
    }

    // Step 8: Check for attachments
    if (!parsedEmail.attachments || parsedEmail.attachments.length === 0) {
      console.log("[MONITORING] No attachments to process", pet, emailInfo);
      
      // Mark email as completed even if there are no attachments
      // (lock was acquired, so we need to release it)
      const totalDuration = Date.now() - startTime;
      console.log(`[MONITORING] Marking email as completed (no attachments, message stored: ${messageStored}, duration: ${totalDuration}ms)`);
      
      await markEmailAsCompleted(
        s3Config.fileKey,
        pet.id,
        0, // no attachments
        true // success
      );
      
      console.log(`[MONITORING] ✅ Email processing completed (no attachments) in ${totalDuration}ms`);
      
      return buildSuccessResponse(pet, emailInfo, [], "No attachments to process");
    }

    // Step 9: Process all attachments
    const attachmentProcessingStartTime = Date.now();
    console.log(`[MONITORING] Starting attachment processing (${parsedEmail.attachments.length} attachments)`);
    
    const emailContext: EmailContext = {
      subject: parsedEmail.subject,
      textBody: parsedEmail.textBody,
    };

    const processedAttachments = await processAttachments(
      pet,
      parsedEmail.attachments,
      emailContext
    );

    const attachmentProcessingDuration = Date.now() - attachmentProcessingStartTime;
    console.log(`[MONITORING] ✅ Attachment processing completed (${attachmentProcessingDuration}ms, ${processedAttachments.length} processed)`);

    // Step 10: Log summary and return success
    logProcessingSummary(processedAttachments);

    // Step 11: Mark email as completed (idempotency)
    const totalDuration = Date.now() - startTime;
    console.log(`[MONITORING] Marking email as completed (total duration: ${totalDuration}ms, attachments: ${processedAttachments.length}, message stored: ${messageStored})`);
    
    await markEmailAsCompleted(
      s3Config.fileKey,
      pet.id,
      processedAttachments.length,
      true
    );
    
    console.log(`[MONITORING] ✅ Email processing completed successfully in ${totalDuration}ms`);

    // Step 12: Check for skipped attachments due to pet validation failure
    const skippedAttachments = processedAttachments.filter(
      (a) => a.skippedReason === "no_pet_info" || 
             a.skippedReason === "microchip_mismatch" || 
             a.skippedReason === "attributes_mismatch"
    );

    // Step 13: Send notifications
    // Send skipped notification if any attachments were skipped due to pet validation failure
    if (skippedAttachments.length > 0) {
      await sendSkippedAttachmentsNotification(pet, emailInfo, skippedAttachments);
    }

    // Send processed notification if records were successfully added
    await sendProcessedNotification(pet, emailInfo, processedAttachments);

    return buildSuccessResponse(pet, emailInfo, processedAttachments);
  } catch (error) {
    const totalDuration = Date.now() - startTime;
    const errorMessage = error instanceof Error ? error.message : String(error);
    const errorStack = error instanceof Error ? error.stack : undefined;
    
    console.error(`[MONITORING] ❌ Error processing email (duration: ${totalDuration}ms):`, errorMessage);
    if (errorStack) {
      console.error(`[MONITORING] Error stack:`, errorStack);
    }

    // Mark email as completed with failure status if we have the s3Config
    if (s3Config) {
      try {
        console.log(`[MONITORING] Marking email as completed with failure status`);
        await markEmailAsCompleted(
          s3Config.fileKey,
          pet?.id || "unknown",
          0,
          false
        );
      } catch (markError) {
        console.error(`[MONITORING] ❌ Failed to mark email as completed:`, markError);
      }
    }

    // Send failure notification if we have pet and sender info
    if (pet && senderEmail) {
      try {
        await sendFailedNotification(pet, senderEmail);
      } catch (notifError) {
        console.error(`[MONITORING] ❌ Failed to send failure notification:`, notifError);
      }
    }

    return buildErrorResponse(errorMessage);
  }
});

/**
 * Parse and validate the request body
 */
async function parseRequest(req: Request): Promise<S3Config | null> {
  const body = await req.json();
  const { bucket, fileKey } = body as S3Config;

  if (!bucket || !fileKey) {
    return null;
  }

  return { bucket, fileKey };
}

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

  curl -i --location --request POST 'http://127.0.0.1:54321/functions/v1/process-pet-mail' \
    --header 'Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0' \
    --header 'Content-Type: application/json' \
    --data '{"bucket":"your-bucket-name","fileKey":"path/to/email.eml"}'

*/
