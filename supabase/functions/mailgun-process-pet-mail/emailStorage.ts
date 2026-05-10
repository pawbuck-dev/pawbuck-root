import { createClient } from "jsr:@supabase/supabase-js@2";
import type { ParsedEmail } from "./types.ts";

/**
 * Storage bucket for pending email approvals
 */
const PENDING_EMAILS_BUCKET = "pending-emails";

/** Stay under typical Storage / gateway limits; PDF base64 can exceed this quickly. */
const ARCHIVE_JSON_BYTE_SOFT_CAP = 4_500_000;

/**
 * Creates a Supabase client with service role key
 */
function createSupabaseClient() {
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

  if (!supabaseUrl || !supabaseServiceKey) {
    throw new Error("Missing Supabase environment variables");
  }

  return createClient(supabaseUrl, supabaseServiceKey);
}

/**
 * Generates a storage path for the email data
 * @param messageId - The unique message ID from the email
 * @returns Storage path in format: {messageId}.json
 */
function generateStoragePath(messageId: string): string {
  // Sanitize messageId to be a valid filename
  // Remove angle brackets and special characters
  const sanitizedId = messageId
    .replace(/[<>]/g, "")
    .replace(/[^a-zA-Z0-9._@-]/g, "_");
  return `${sanitizedId}.json`;
}

function utf8ByteLength(s: string): number {
  return new TextEncoder().encode(s).length;
}

/** Keeps headers + attachment metadata; drops base64 bodies so archive JSON stays small. */
function stripAttachmentBodiesForArchive(email: ParsedEmail): ParsedEmail {
  return {
    ...email,
    attachments: email.attachments.map((a) => ({
      ...a,
      content: "",
      contentWasStrippedForArchive: true,
    })),
  };
}

/**
 * Store parsed email data for later re-processing after approval
 * @param messageId - The unique message ID from the email
 * @param parsedEmail - The parsed email data including attachments
 * @returns The storage path where the email was saved
 */
export async function storeEmailForApproval(
  messageId: string,
  parsedEmail: ParsedEmail
): Promise<string> {
  console.log(`Storing email for approval: ${messageId}`);

  const supabase = createSupabaseClient();
  const storagePath = generateStoragePath(messageId);

  let emailToStore: ParsedEmail = parsedEmail;
  let emailJson = JSON.stringify(emailToStore);
  let bytes = utf8ByteLength(emailJson);
  if (bytes > ARCHIVE_JSON_BYTE_SOFT_CAP) {
    console.warn(
      `[emailStorage] Archive JSON ${bytes} bytes exceeds soft cap ${ARCHIVE_JSON_BYTE_SOFT_CAP}; storing metadata-only (no attachment bodies) for ${messageId}`,
    );
    emailToStore = stripAttachmentBodiesForArchive(parsedEmail);
    emailJson = JSON.stringify(emailToStore);
    bytes = utf8ByteLength(emailJson);
    console.log(`[emailStorage] After strip: ${bytes} bytes`);
  }

  const encoder = new TextEncoder();
  const fileData = encoder.encode(emailJson);

  // Upload to pending-emails bucket
  const { error } = await supabase.storage
    .from(PENDING_EMAILS_BUCKET)
    .upload(storagePath, fileData, {
      contentType: "application/json",
      upsert: true, // Overwrite if exists (retry scenario)
    });

  if (error) {
    console.error(
      `[emailStorage] Upload failed (${bytes} bytes, path ${storagePath}):`,
      error,
    );
    // Retry once with bodies stripped (handles gateways that reject large bodies)
    if (!emailToStore.attachments.some((a) => a.contentWasStrippedForArchive)) {
      const stripped = stripAttachmentBodiesForArchive(parsedEmail);
      const retryJson = JSON.stringify(stripped);
      const retryBytes = utf8ByteLength(retryJson);
      console.warn(
        `[emailStorage] Retrying upload without attachment bodies (${retryBytes} bytes)`,
      );
      const retryData = encoder.encode(retryJson);
      const { error: retryError } = await supabase.storage
        .from(PENDING_EMAILS_BUCKET)
        .upload(storagePath, retryData, {
          contentType: "application/json",
          upsert: true,
        });
      if (retryError) {
        console.error("[emailStorage] Retry upload also failed:", retryError);
        throw new Error(
          `Failed to store email for approval: ${retryError.message}`,
        );
      }
      console.log(`Successfully stored email (metadata-only) at: ${storagePath}`);
      return storagePath;
    }
    throw new Error(`Failed to store email for approval: ${error.message}`);
  }

  console.log(`Successfully stored email at: ${storagePath}`);
  return storagePath;
}

/**
 * Retrieve stored email data for re-processing after approval
 * @param storagePath - The storage path (or messageId) of the email
 * @returns The parsed email data
 */
export async function retrieveEmailForReprocessing(
  storagePath: string
): Promise<ParsedEmail> {
  console.log(`Retrieving email for re-processing: ${storagePath}`);

  const supabase = createSupabaseClient();

  // If the path doesn't end with .json, it might be a messageId
  const path = storagePath.endsWith(".json")
    ? storagePath
    : generateStoragePath(storagePath);

  // Download the email data from storage
  const { data, error } = await supabase.storage
    .from(PENDING_EMAILS_BUCKET)
    .download(path);

  if (error) {
    console.error("Error retrieving email for re-processing:", error);
    throw new Error(
      `Failed to retrieve email for re-processing: ${error.message}`
    );
  }

  // Parse the JSON data
  const emailJson = await data.text();
  const parsedEmail = JSON.parse(emailJson) as ParsedEmail;

  console.log(
    `Successfully retrieved email: from=${parsedEmail.from?.address}, subject=${parsedEmail.subject}`
  );
  return parsedEmail;
}

/**
 * Delete stored email data after successful processing
 * @param storagePath - The storage path (or messageId) of the email
 */
export async function deleteStoredEmail(storagePath: string): Promise<void> {
  console.log(`Deleting stored email: ${storagePath}`);

  const supabase = createSupabaseClient();

  // If the path doesn't end with .json, it might be a messageId
  const path = storagePath.endsWith(".json")
    ? storagePath
    : generateStoragePath(storagePath);

  const { error } = await supabase.storage
    .from(PENDING_EMAILS_BUCKET)
    .remove([path]);

  if (error) {
    // Log but don't throw - cleanup failure shouldn't break the flow
    console.error("Error deleting stored email:", error);
  } else {
    console.log(`Successfully deleted stored email: ${path}`);
  }
}
