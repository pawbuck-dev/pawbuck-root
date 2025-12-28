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
  verifySender,
} from "./handlers/index.ts";
import {
  markEmailAsCompleted,
  tryAcquireProcessingLock,
} from "./idempotencyChecker.ts";
import { findPetByEmail } from "./petLookup.ts";
import { fetchEmailFromS3 } from "./s3Client.ts";
import type { EmailContext, EmailInfo, Pet, S3Config } from "./types.ts";

console.log("process-pet-mail function initialized");

Deno.serve(async (req) => {
  let pet: Pet | null = null;
  let senderEmail: string | null = null;

  try {
    // Step 1: Parse and validate request
    const s3Config = await parseRequest(req);
    if (!s3Config) {
      return buildValidationErrorResponse(
        "Missing required parameters: bucket and fileKey"
      );
    }

    // Step 1.5: Acquire processing lock (idempotency)
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

    // Step 7: Check for attachments
    if (!parsedEmail.attachments || parsedEmail.attachments.length === 0) {
      console.log("No attachments to process", pet, emailInfo);
      return buildSuccessResponse(pet, emailInfo, [], "No attachments to process");
    }

    // Step 8: Process all attachments
    const emailContext: EmailContext = {
      subject: parsedEmail.subject,
      textBody: parsedEmail.textBody,
    };

    const processedAttachments = await processAttachments(
      pet,
      parsedEmail.attachments,
      emailContext
    );

    // Step 9: Log summary and return success
    logProcessingSummary(processedAttachments);

    // Step 10: Mark email as completed (idempotency)
    await markEmailAsCompleted(
      s3Config.fileKey,
      pet.id,
      processedAttachments.length,
      true
    );

    // Step 11: Send notification if records were successfully added
    await sendProcessedNotification(pet, emailInfo, processedAttachments);

    return buildSuccessResponse(pet, emailInfo, processedAttachments);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error("Error processing email:", error);

    // Send failure notification if we have pet and sender info
    if (pet && senderEmail) {
      await sendFailedNotification(pet, senderEmail);
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
