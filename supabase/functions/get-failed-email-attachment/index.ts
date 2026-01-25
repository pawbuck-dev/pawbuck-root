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
 * This function retrieves the stored email JSON and extracts attachments,
 * then uploads them temporarily to the pets bucket for viewing
 * 
 * If attachment_index is provided, returns that specific attachment.
 * If not provided, returns a list of all attachments.
 */
Deno.serve(async (req) => {
  // Handle CORS
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { s3_key, attachment_index } = await req.json();

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

    // Get attachments
    if (!parsedEmail.attachments || parsedEmail.attachments.length === 0) {
      return new Response(
        JSON.stringify({ error: "No attachments found in email" }),
        {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // If attachment_index is provided, return that specific attachment
    if (attachment_index !== undefined && attachment_index !== null) {
      const index = parseInt(String(attachment_index), 10);
      if (isNaN(index) || index < 0 || index >= parsedEmail.attachments.length) {
        return new Response(
          JSON.stringify({ error: "Invalid attachment index" }),
          {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }

      const attachment = parsedEmail.attachments[index];
      const tempPath = `temp-email-attachments/${sanitizedId}/${attachment.filename}`;
      
      // Decode base64 content
      // Handle both standard base64 and data URLs
      let base64Content = attachment.content;
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
          contentType: attachment.mimeType,
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
          filename: attachment.filename,
          mimeType: attachment.mimeType,
        }),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // If no index provided, return list of all attachments
    const attachmentsList = parsedEmail.attachments.map((att, index) => ({
      index,
      filename: att.filename,
      mimeType: att.mimeType,
      size: att.size,
    }));

    return new Response(
      JSON.stringify({ 
        attachments: attachmentsList,
        totalCount: attachmentsList.length,
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
