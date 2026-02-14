/**
 * Thread Creation Utilities
 * 
 * Functions to create new message threads from inbound emails
 * Used when a conversation starts with an incoming email (vet initiates conversation)
 */

import { createClient } from "jsr:@supabase/supabase-js@2";

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
 * Generate unique reply-to address for thread
 */
function generateReplyToAddress(threadId: string, domain: string): string {
  // Use thread ID and a short hash for uniqueness
  const hash = threadId.substring(0, 8).replace(/-/g, "");
  return `thread-${hash}@${domain}`;
}

export interface CreateThreadParams {
  userId: string;
  petId: string;
  recipientEmail: string; // The sender's email (vet/care provider)
  recipientName: string | null;
  subject: string;
}

export interface ThreadCreationResult {
  threadId: string;
  replyToAddress: string;
}

/**
 * Create a new thread from an inbound email
 * This is used when a conversation starts with an incoming email
 */
export async function createThreadFromInboundEmail(
  params: CreateThreadParams
): Promise<ThreadCreationResult> {
  const supabase = createSupabaseClient();
  
  console.log(`[ThreadCreation] Creating new thread for recipient: ${params.recipientEmail}, pet: ${params.petId}`);
  
  const domain = Deno.env.get("EMAIL_DOMAIN") || "pawbuck.app";
  const newThreadId = crypto.randomUUID();
  const replyToAddress = generateReplyToAddress(newThreadId, domain);

  const { data: newThread, error } = await supabase
    .from("message_threads")
    .insert({
      pet_id: params.petId,
      user_id: params.userId,
      recipient_email: params.recipientEmail.toLowerCase().trim(),
      recipient_name: params.recipientName,
      reply_to_address: replyToAddress,
      subject: params.subject,
    })
    .select()
    .single();

  if (error) {
    console.error("[ThreadCreation] Error creating thread:", error);
    throw error;
  }

  console.log(`[ThreadCreation] ✅ Created new thread: ${newThread.id} (reply-to: ${replyToAddress})`);
  
  return {
    threadId: newThread.id,
    replyToAddress: newThread.reply_to_address,
  };
}

