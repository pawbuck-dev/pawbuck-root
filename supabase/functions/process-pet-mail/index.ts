// Follow this setup guide to integrate the Deno language server with your editor:
// https://deno.land/manual/getting_started/setup_your_environment
// This enables autocomplete, go to definition, etc.

// Setup type definitions for built-in Supabase Runtime APIs
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { parseEmail } from "./emailParser.ts";
import { classifyAttachment } from "./geminiClassifier.ts";
import { triggerOCR } from "./ocrTrigger.ts";
import { findPetByEmail } from "./petLookup.ts";
import { fetchEmailFromS3 } from "./s3Client.ts";
import { uploadAttachment } from "./storageUploader.ts";
import type {
  ProcessedAttachment,
  ProcessingResult,
  S3Config,
} from "./types.ts";

console.log("process-pet-mail function initialized");

Deno.serve(async (req) => {
  try {
    const body = await req.json();
    const { bucket, fileKey } = body as S3Config;

    if (!bucket || !fileKey) {
      return new Response(
        JSON.stringify({
          success: false,
          error: "Missing required parameters: bucket and fileKey",
        }),
        {
          status: 400,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    // Step 1: Fetch email from S3
    const rawEmail = await fetchEmailFromS3({ bucket, fileKey });

    // Step 2: Parse email and extract attachments
    const parsedEmail = await parseEmail(rawEmail);

    console.log("Email parsed:", {
      from: parsedEmail.from?.address,
      to: parsedEmail.to.map((t) => t.address),
      subject: parsedEmail.subject,
      attachmentCount: parsedEmail.attachments.length,
    });

    // Step 3: Extract recipient email and find pet
    if (!parsedEmail.to || parsedEmail.to.length === 0) {
      return new Response(
        JSON.stringify({
          success: false,
          error: "No recipient email found in parsed email",
        }),
        {
          status: 400,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    // Use the first recipient email to find the pet
    const recipientEmail = parsedEmail.to[0].address;
    console.log(`Looking up pet by email: ${recipientEmail}`);

    const pet = await findPetByEmail(recipientEmail);

    if (!pet) {
      return new Response(
        JSON.stringify({
          success: false,
          error: `No pet found with email address: ${recipientEmail}`,
        }),
        {
          status: 404,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    console.log(`Found pet: ${pet.name} (ID: ${pet.id})`);

    // Step 4: Check if there are attachments
    if (!parsedEmail.attachments || parsedEmail.attachments.length === 0) {
      const result: ProcessingResult = {
        success: true,
        pet,
        email: {
          from: parsedEmail.from?.address || null,
          subject: parsedEmail.subject,
          date: parsedEmail.date,
        },
        processedAttachments: [],
      };

      return new Response(
        JSON.stringify({
          ...result,
          message: "No attachments to process",
        }),
        {
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    // Step 5: Process each attachment
    const processedAttachments: ProcessedAttachment[] = [];

    for (const attachment of parsedEmail.attachments) {
      console.log(`\n=== Processing attachment: ${attachment.filename} ===`);

      try {
        // Step 5a: Classify attachment with Gemini AI
        const classification = await classifyAttachment(
          attachment,
          parsedEmail.subject,
          parsedEmail.textBody
        );

        console.log(
          `Classification result: ${classification.type} (confidence: ${classification.confidence})`
        );

        // Step 5b: Skip irrelevant attachments
        if (classification.type === "irrelevant") {
          console.log(`Skipping irrelevant attachment: ${attachment.filename}`);
          processedAttachments.push({
            filename: attachment.filename,
            mimeType: attachment.mimeType,
            size: attachment.size,
            classification,
            uploaded: false,
            ocrTriggered: false,
            ocrSuccess: false,
          });
          continue;
        }

        // Step 5c: Upload to Supabase Storage
        let storagePath: string;
        let uploaded = false;

        try {
          storagePath = await uploadAttachment(
            pet,
            classification.type,
            attachment.filename,
            attachment.content,
            attachment.mimeType
          );
          uploaded = true;
          console.log(`Upload successful: ${storagePath}`);
        } catch (uploadError) {
          const errorMessage =
            uploadError instanceof Error
              ? uploadError.message
              : String(uploadError);
          console.error(
            `Upload failed for ${attachment.filename}:`,
            uploadError
          );
          processedAttachments.push({
            filename: attachment.filename,
            mimeType: attachment.mimeType,
            size: attachment.size,
            classification,
            uploaded: false,
            ocrTriggered: false,
            ocrSuccess: false,
            error: `Upload failed: ${errorMessage}`,
          });
          continue;
        }

        // Step 5d: Trigger OCR
        let ocrResult;
        let ocrSuccess = false;

        try {
          const ocrResponse = await triggerOCR(
            classification.type,
            "pet",
            storagePath
          );

          ocrSuccess = ocrResponse.success;
          ocrResult = ocrResponse.data;

          if (!ocrSuccess) {
            console.error(`OCR failed: ${ocrResponse.error}`);
          } else {
            console.log("OCR completed successfully");
          }
        } catch (ocrError) {
          console.error(`OCR trigger failed:`, ocrError);
        }

        // Add processed attachment to results
        processedAttachments.push({
          filename: attachment.filename,
          mimeType: attachment.mimeType,
          size: attachment.size,
          classification,
          uploaded,
          storagePath,
          ocrTriggered: true,
          ocrResult,
          ocrSuccess,
        });
      } catch (attachmentError) {
        const errorMessage =
          attachmentError instanceof Error
            ? attachmentError.message
            : String(attachmentError);
        console.error(
          `Error processing attachment ${attachment.filename}:`,
          attachmentError
        );
        processedAttachments.push({
          filename: attachment.filename,
          mimeType: attachment.mimeType,
          size: attachment.size,
          classification: {
            type: "irrelevant",
            confidence: 0,
            reasoning: "Processing failed",
          },
          uploaded: false,
          ocrTriggered: false,
          ocrSuccess: false,
          error: errorMessage,
        });
      }
    }

    // Step 6: Return complete results
    const result: ProcessingResult = {
      success: true,
      pet,
      email: {
        from: parsedEmail.from?.address || null,
        subject: parsedEmail.subject,
        date: parsedEmail.date,
      },
      processedAttachments,
    };

    console.log("\n=== Processing Complete ===");
    console.log(`Total attachments: ${processedAttachments.length}`);
    console.log(
      `Uploaded: ${processedAttachments.filter((a) => a.uploaded).length}`
    );
    console.log(
      `OCR success: ${processedAttachments.filter((a) => a.ocrSuccess).length}`
    );

    return new Response(JSON.stringify(result), {
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error("Error processing email:", error);
    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
});

/* To invoke locally:

  1. Run `supabase start` (see: https://supabase.com/docs/reference/cli/supabase-start)
  2. Make an HTTP request:

  curl -i --location --request POST 'http://127.0.0.1:54321/functions/v1/process-pet-mail' \
    --header 'Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0' \
    --header 'Content-Type: application/json' \
    --data '{"bucket":"your-bucket-name","fileKey":"path/to/email.eml"}'

*/
