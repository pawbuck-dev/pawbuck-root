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
  messageId?: string | null; // Email Message-Id header for threading
}

/**
 * Store an inbound message in the thread_messages table
 */
export async function storeInboundMessage(
  params: StoreMessageParams
): Promise<void> {
  const supabase = createSupabaseClient();

  console.log(
    `[MessageStorage] Storing inbound message for thread ${params.threadId}`
  );
  console.log(
    `[MessageStorage] From: ${params.senderEmail}, To: ${params.recipientEmail}`
  );
  console.log(
    `[MessageStorage] Subject: ${params.subject}, Body length: ${params.body.length}`
  );

  const messageData = {
    thread_id: params.threadId,
    direction: "inbound",
    sender_email: params.senderEmail.toLowerCase().trim(),
    recipient_email: params.recipientEmail.toLowerCase().trim(),
    cc: params.cc ? params.cc.map((e) => e.toLowerCase().trim()) : null,
    bcc: params.bcc ? params.bcc.map((e) => e.toLowerCase().trim()) : null,
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
    console.error(
      "[MessageStorage] Error details:",
      JSON.stringify(error, null, 2)
    );
    throw error;
  }

  console.log(
    `[MessageStorage] ✅ Message inserted successfully (ID: ${data?.id || "unknown"})`
  );

  // Update thread updated_at timestamp, message_id, and subject (if not a reply)
  const threadUpdateData: {
    updated_at: string;
    message_id?: string;
    subject?: string;
  } = {
    updated_at: new Date().toISOString(),
  };

  // Update message_id if provided (for email threading support)
  if (params.messageId) {
    threadUpdateData.message_id = params.messageId;
    console.log(
      `[MessageStorage] Updating thread message_id to: ${params.messageId}`
    );
  }

  // Update subject if it's not a reply (doesn't start with RE:)
  const isReply = /^re:/i.test(params.subject.trim());
  if (!isReply) {
    threadUpdateData.subject = params.subject;
    console.log(
      `[MessageStorage] Updating thread subject to: ${params.subject}`
    );
  } else {
    console.log(
      `[MessageStorage] Subject starts with RE:, not updating thread subject`
    );
  }

  const { error: updateError } = await supabase
    .from("message_threads")
    .update(threadUpdateData)
    .eq("id", params.threadId);

  if (updateError) {
    console.error("[MessageStorage] ⚠️ Error updating thread:", updateError);
    // Don't throw - message was stored successfully
  } else {
    console.log(
      `[MessageStorage] ✅ Thread updated for thread ${params.threadId} (message_id: ${params.messageId || "unchanged"}, subject: ${isReply ? "unchanged" : "updated"})`
    );
  }
}
