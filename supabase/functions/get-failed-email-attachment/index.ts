import { corsHeaders } from "../_shared/cors.ts";
import { createSupabaseClient } from "../_shared/supabase-utils.ts";

interface ParsedAttachment {
  filename: string;
  mimeType: string;
  size: number;
  content: string; // Base64 encoded
}

interface ParsedEmail {
  from: { name: string; address: string } | null;
  to: { name: string; address: string }[];
  cc: { name: string; address: string }[];
  subject: string;
  date: string | null;
  messageId: string | null;
  textBody: string | null;
  htmlBody: string | null;
  attachments: ParsedAttachment[];
}

/**
 * Get attachment from stored email for failed email processing
 * This function retrieves the stored email JSON and extracts the first attachment,
 * then uploads it temporarily to the pets bucket for viewing
 */
Deno.serve(async (req) => {
  // Handle CORS
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { s3_key } = await req.json();

    if (!s3_key) {
      return new Response(
        JSON.stringify({ error: "Missing s3_key parameter" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const supabase = createSupabaseClient();

    // Generate storage path for the email JSON
    const sanitizedId = s3_key
      .replace(/[<>]/g, "")
      .replace(/[^a-zA-Z0-9._@-]/g, "_");
    const emailJsonPath = `${sanitizedId}.json`;

    // Download the stored email JSON from pending-emails bucket
    const { data: emailData, error: downloadError } = await supabase.storage
      .from("pending-emails")
      .download(emailJsonPath);

    if (downloadError) {
      console.error("Error downloading stored email:", downloadError);
      // Email might not be stored if sender was known/whitelisted
      // In that case, the attachment was never uploaded and can't be retrieved
      return new Response(
        JSON.stringify({ 
          error: "Attachment not available",
          details: "The email attachment cannot be retrieved. This may occur if the email was from a known sender and wasn't stored, or if the stored email data has been deleted.",
          code: "ATTACHMENT_NOT_STORED"
        }),
        {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Parse the email JSON
    const emailJson = await emailData.text();
    const parsedEmail: ParsedEmail = JSON.parse(emailJson);

    // Get the first attachment
    if (!parsedEmail.attachments || parsedEmail.attachments.length === 0) {
      return new Response(
        JSON.stringify({ error: "No attachments found in email" }),
        {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const firstAttachment = parsedEmail.attachments[0];

    // Upload the attachment to pets bucket temporarily for viewing
    // Use a path that includes the email identifier
    const tempPath = `temp-email-attachments/${sanitizedId}/${firstAttachment.filename}`;
    
    // Decode base64 content
    // Handle both standard base64 and data URLs
    let base64Content = firstAttachment.content;
    if (base64Content.includes(",")) {
      // Remove data URL prefix if present (e.g., "data:image/png;base64,")
      base64Content = base64Content.split(",")[1];
    }
    
    const binaryString = atob(base64Content);
    const fileData = Uint8Array.from(binaryString, (c) => c.charCodeAt(0));

    // Upload to pets bucket
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from("pets")
      .upload(tempPath, fileData, {
        contentType: firstAttachment.mimeType,
        upsert: true, // Overwrite if exists
      });

    if (uploadError) {
      console.error("Error uploading attachment:", uploadError);
      return new Response(
        JSON.stringify({ 
          error: "Failed to prepare attachment for viewing",
          details: uploadError.message 
        }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Return the storage path
    return new Response(
      JSON.stringify({ 
        attachmentPath: tempPath,
        filename: firstAttachment.filename,
        mimeType: firstAttachment.mimeType,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Error in get-failed-email-attachment:", error);
    return new Response(
      JSON.stringify({ 
        error: "Internal server error",
        details: error instanceof Error ? error.message : String(error)
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
