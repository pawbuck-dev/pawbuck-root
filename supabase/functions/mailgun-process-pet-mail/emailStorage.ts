import { createClient } from "jsr:@supabase/supabase-js@2";
import type { ParsedEmail } from "./types.ts";

/**
 * Storage bucket for pending email approvals
 */
const PENDING_EMAILS_BUCKET = "pending-emails";

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

  // Serialize the email data to JSON
  const emailJson = JSON.stringify(parsedEmail);
  const encoder = new TextEncoder();
  const fileData = encoder.encode(emailJson);

  // Upload to pending-emails bucket
  const { data, error } = await supabase.storage
    .from(PENDING_EMAILS_BUCKET)
    .upload(storagePath, fileData, {
      contentType: "application/json",
      upsert: true, // Overwrite if exists (retry scenario)
    });

  if (error) {
    console.error("Error storing email for approval:", error);
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
