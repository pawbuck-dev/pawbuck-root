/**
 * Message Storage Utilities
 * 
 * Functions to store inbound messages in the thread_messages table
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

export interface StoreMessageParams {
  threadId: string;
  senderEmail: string;
  recipientEmail: string;
  cc?: string[] | null;
  bcc?: string[] | null;
  subject: string;
  body: string; // Should already be cleaned
  sentAt?: string; // ISO timestamp, defaults to now
}

/**
 * Store an inbound message in the thread_messages table
 */
export async function storeInboundMessage(
  params: StoreMessageParams
): Promise<void> {
  const supabase = createSupabaseClient();

  console.log(`[MessageStorage] Storing inbound message for thread ${params.threadId}`);
  console.log(`[MessageStorage] From: ${params.senderEmail}, To: ${params.recipientEmail}`);
  console.log(`[MessageStorage] Subject: ${params.subject}, Body length: ${params.body.length}`);

  const messageData = {
    thread_id: params.threadId,
    direction: "inbound",
    sender_email: params.senderEmail.toLowerCase().trim(),
    recipient_email: params.recipientEmail.toLowerCase().trim(),
    cc: params.cc ? params.cc.map(e => e.toLowerCase().trim()) : null,
    bcc: params.bcc ? params.bcc.map(e => e.toLowerCase().trim()) : null,
    subject: params.subject,
    body: params.body,
    sent_at: params.sentAt || new Date().toISOString(),
  };

  const { data, error } = await supabase
    .from("thread_messages")
    .insert(messageData)
    .select()
    .single();

  if (error) {
    console.error("[MessageStorage] ❌ Error storing inbound message:", error);
    console.error("[MessageStorage] Error details:", JSON.stringify(error, null, 2));
    throw error;
  }

  console.log(`[MessageStorage] ✅ Message inserted successfully (ID: ${data?.id || "unknown"})`);

  // Update thread updated_at timestamp
  const { error: updateError } = await supabase
    .from("message_threads")
    .update({ updated_at: new Date().toISOString() })
    .eq("id", params.threadId);

  if (updateError) {
    console.error("[MessageStorage] ⚠️ Error updating thread timestamp:", updateError);
    // Don't throw - message was stored successfully
  } else {
    console.log(`[MessageStorage] ✅ Thread timestamp updated for thread ${params.threadId}`);
  }
}
