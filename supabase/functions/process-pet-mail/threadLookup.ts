/**
 * Thread Lookup Utilities
 * 
 * Functions to find message threads by reply-to addresses
 * This enables linking inbound email replies to existing threads
 */

import { createClient } from "jsr:@supabase/supabase-js@2";

export interface ThreadInfo {
  threadId: string;
  petId: string;
  userId: string;
  recipientEmail: string;
  recipientName: string | null;
  subject: string;
}

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
 * Find thread by reply-to address
 * When a vet replies to an email, the reply-to address matches the thread's reply_to_address
 */

export async function findThreadByReplyToAddress(
  replyToAddress: string
): Promise<ThreadInfo | null> {
  const supabase = createSupabaseClient();

  const normalizedAddress = replyToAddress.toLowerCase().trim();
  console.log(`[ThreadLookup] Searching for thread with reply_to_address: "${normalizedAddress}"`);

  const { data, error } = await supabase
    .from("message_threads")
    .select("id, pet_id, user_id, recipient_email, recipient_name, subject, reply_to_address")
    .eq("reply_to_address", normalizedAddress)
    .maybeSingle();

  if (error) {
    console.error("[ThreadLookup] Error finding thread by reply-to address:", error);
    throw error;
  }

  if (!data) {
    console.log(`[ThreadLookup] No thread found with reply_to_address: "${normalizedAddress}"`);
    return null;
  }

  console.log(`[ThreadLookup] ✅ Found thread: ${data.id} (subject: ${data.subject}, recipient: ${data.recipient_email})`);
  return {
    threadId: data.id,
    petId: data.pet_id,
    userId: data.user_id,
    recipientEmail: data.recipient_email,
    recipientName: data.recipient_name,
    subject: data.subject,
  };
}

/**
 * Find thread by recipient email and pet ID
 * Used as a fallback when reply-to address doesn't match
 */
export async function findThreadByRecipientAndPet(
  recipientEmail: string,
  petId: string
): Promise<ThreadInfo | null> {
  const supabase = createSupabaseClient();

  const normalizedEmail = recipientEmail.toLowerCase().trim();
  console.log(`[ThreadLookup] Fallback: Searching for thread with recipient_email: "${normalizedEmail}", pet_id: "${petId}"`);

  const { data, error } = await supabase
    .from("message_threads")
    .select("id, pet_id, user_id, recipient_email, recipient_name, subject, reply_to_address")
    .eq("recipient_email", normalizedEmail)
    .eq("pet_id", petId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    console.error("[ThreadLookup] Error finding thread by recipient and pet:", error);
    throw error;
  }

  if (!data) {
    console.log(`[ThreadLookup] No thread found with recipient_email: "${normalizedEmail}", pet_id: "${petId}"`);
    return null;
  }

  console.log(`[ThreadLookup] ✅ Found thread (fallback): ${data.id} (subject: ${data.subject}, reply_to: ${data.reply_to_address})`);
  return {
    threadId: data.id,
    petId: data.pet_id,
    userId: data.user_id,
    recipientEmail: data.recipient_email,
    recipientName: data.recipient_name,
    subject: data.subject,
  };
}

