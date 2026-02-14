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
      // Return 200 OK with error code so client can read the response body
      return new Response(
        JSON.stringify({ 
          error: "Attachment not available",
          details: "The email attachment cannot be retrieved. This may occur if the email was from a known sender and wasn't stored, or if the stored email data has been deleted.",
          code: "ATTACHMENT_NOT_STORED"
        }),
        {
          status: 200,
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
        JSON.stringify({ 
          error: "No attachments found in email",
          code: "NO_ATTACHMENTS"
        }),
        {
          status: 200,
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
      
      console.log(`Preparing to upload attachment: ${attachment.filename} to path: ${tempPath}`);
      console.log(`Attachment size: ${attachment.size} bytes, mimeType: ${attachment.mimeType}`);
      
      // Decode base64 content
      // Handle both standard base64 and data URLs
      let base64Content = attachment.content;
      if (base64Content.includes(",")) {
        // Remove data URL prefix if present (e.g., "data:image/png;base64,")
        base64Content = base64Content.split(",")[1];
      }
      
      const binaryString = atob(base64Content);
      const fileData = Uint8Array.from(binaryString, (c) => c.charCodeAt(0));
      
      console.log(`Decoded file data size: ${fileData.length} bytes`);

      // Upload to pets bucket
      console.log(`Uploading to pets bucket at path: ${tempPath}`);
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from("pets")
        .upload(tempPath, fileData, {
          contentType: attachment.mimeType,
          upsert: true, // Overwrite if exists
        });
      
      console.log(`Upload result - hasData: ${!!uploadData}, hasError: ${!!uploadError}, uploadData.path: ${uploadData?.path}`);

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

      // Verify upload was successful
      if (!uploadData || !uploadData.path) {
        console.error("Upload returned no data or path");
        return new Response(
          JSON.stringify({ 
            error: "Failed to verify attachment upload",
            details: "Upload response missing path"
          }),
          {
            status: 500,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }

      // Use the actual path returned from upload (might be different due to sanitization)
      const actualPath = uploadData.path;
      console.log(`Successfully uploaded attachment to: ${actualPath} (requested: ${tempPath})`);

      // Verify the file exists by trying to get its metadata
      const { data: fileInfo, error: fileCheckError } = await supabase.storage
        .from("pets")
        .list(actualPath.split("/").slice(0, -1).join("/"), {
          limit: 1,
          search: attachment.filename,
        });

      if (fileCheckError) {
        console.error("Error verifying file exists:", fileCheckError);
        // Continue anyway - the upload might have succeeded
      } else {
        console.log(`File verification - found ${fileInfo?.length || 0} matching file(s)`);
      }

      // Create a signed URL immediately and return it instead of the path
      // This avoids path encoding issues and ensures the file is accessible
      const { data: signedUrlData, error: signedUrlError } = await supabase.storage
        .from("pets")
        .createSignedUrl(actualPath, 3600);

      if (signedUrlError) {
        console.error("Error creating signed URL:", signedUrlError);
        return new Response(
          JSON.stringify({ 
            error: "Failed to create signed URL for attachment",
            details: signedUrlError.message,
            path: actualPath
          }),
          {
            status: 500,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }

      // Verify signed URL was created successfully
      if (!signedUrlData || !signedUrlData.signedUrl) {
        console.error("Signed URL data is missing or invalid");
        return new Response(
          JSON.stringify({ 
            error: "Failed to create signed URL for attachment",
            details: "Signed URL data is missing",
            path: actualPath
          }),
          {
            status: 500,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }

      console.log(`Successfully created signed URL for path: ${actualPath}`);
      console.log(`Signed URL length: ${signedUrlData.signedUrl.length} characters`);

      // Return the signed URL directly instead of the path
      // This avoids any path encoding/access issues on the client side
      return new Response(
        JSON.stringify({ 
          signedUrl: signedUrlData.signedUrl,
          attachmentPath: actualPath, // Keep for reference
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
