// supabase/functions/send-message/index.ts
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { corsHeaders, errorResponse, jsonResponse } from "../_shared/cors.ts";
import { createSupabaseClient } from "../_shared/supabase-utils.ts";

interface SendMessageRequest {
  petId: string;
  to: string;
  cc?: string;
  bcc?: string;
  subject: string;
  message: string;
}

const DOMAIN = Deno.env.get("MAIL_DOMAIN") || "pawbuck.app";

// Generate or get existing thread ID
async function getOrCreateThread(
  supabase: any,
  userId: string,
  petId: string,
  recipientEmail: string,
  recipientName: string | null,
  replyToAddress: string,
  subject: string
): Promise<{
  threadId: string;
  replyToAddress: string;
  isExisting: boolean;
  messageId: string | null;
  subject: string;
}> {
  console.log(`[getOrCreateThread] Looking for existing thread...`);
  console.log(`[getOrCreateThread]   - petId: ${petId}`);
  console.log(`[getOrCreateThread]   - userId: ${userId}`);
  console.log(
    `[getOrCreateThread]   - recipientEmail: ${recipientEmail.toLowerCase()}`
  );

  // Check if thread exists (by recipient email and pet)
  const { data: existingThread, error: lookupError } = await supabase
    .from("message_threads")
    .select("id, reply_to_address, message_id, subject")
    .eq("pet_id", petId)
    .eq("user_id", userId)
    .eq("recipient_email", recipientEmail.toLowerCase())
    .single();

  if (lookupError && lookupError.code !== "PGRST116") {
    console.log(
      `[getOrCreateThread] Lookup error (non-404): ${lookupError.message}`
    );
  }

  if (existingThread) {
    console.log(
      `[getOrCreateThread] Found existing thread: ${existingThread.id}`
    );
    console.log(
      `[getOrCreateThread]   - reply_to_address: ${existingThread.reply_to_address}`
    );
    console.log(
      `[getOrCreateThread]   - message_id: ${existingThread.message_id || "(none)"}`
    );
    console.log(`[getOrCreateThread]   - subject: ${existingThread.subject}`);
    return {
      threadId: existingThread.id,
      replyToAddress: existingThread.reply_to_address,
      isExisting: true,
      messageId: existingThread.message_id,
      subject: existingThread.subject,
    };
  }

  console.log(
    `[getOrCreateThread] No existing thread found, creating new thread...`
  );
  const insertData = {
    pet_id: petId,
    user_id: userId,
    recipient_email: recipientEmail.toLowerCase(),
    recipient_name: recipientName,
    reply_to_address: replyToAddress,
    subject: subject,
  };
  console.log(
    `[getOrCreateThread] Insert data:`,
    JSON.stringify(insertData, null, 2)
  );

  const { data: newThread, error } = await supabase
    .from("message_threads")
    .insert(insertData)
    .select()
    .single();

  if (error) {
    console.error(`[getOrCreateThread] ERROR creating thread:`, error);
    throw error;
  }

  console.log(`[getOrCreateThread] New thread created: ${newThread.id}`);
  return {
    threadId: newThread.id,
    replyToAddress: newThread.reply_to_address,
    isExisting: false,
    messageId: null,
    subject: subject,
  };
}

// Send email via Mailgun API
async function sendEmailViaMailgun(
  to: string,
  cc: string[],
  bcc: string[],
  subject: string,
  body: string,
  replyTo: string,
  petName: string,
  petEmailAddress: string,
  inReplyTo?: string | null
): Promise<{ messageId: string }> {
  console.log(`[sendEmailViaMailgun] Starting email send...`);
  console.log(`[sendEmailViaMailgun]   - to: ${to}`);
  console.log(
    `[sendEmailViaMailgun]   - cc: ${cc.length > 0 ? cc.join(", ") : "(none)"}`
  );
  console.log(
    `[sendEmailViaMailgun]   - bcc: ${bcc.length > 0 ? bcc.join(", ") : "(none)"}`
  );
  console.log(`[sendEmailViaMailgun]   - subject: ${subject}`);
  console.log(`[sendEmailViaMailgun]   - body length: ${body.length} chars`);
  console.log(`[sendEmailViaMailgun]   - replyTo: ${replyTo}`);
  console.log(`[sendEmailViaMailgun]   - petName: ${petName}`);
  console.log(`[sendEmailViaMailgun]   - inReplyTo: ${inReplyTo || "(none)"}`);

  const apiKey = Deno.env.get("MAILGUN_API_KEY");
  const domain = Deno.env.get("MAIL_DOMAIN");
  const fromEmail = petEmailAddress; // Use pet-specific address
  const fromName = `${petName} via Pawbuck`; // Dynamic sender name
  const appUrl = Deno.env.get("APP_URL") || "https://app.pawbuck.app";

  console.log(`[sendEmailViaMailgun] Environment config:`);
  console.log(
    `[sendEmailViaMailgun]   - MAILGUN_API_KEY: ${apiKey ? `${apiKey.substring(0, 8)}...` : "(not set)"}`
  );
  console.log(
    `[sendEmailViaMailgun]   - MAILGUN_DOMAIN: ${domain || "(not set)"}`
  );
  console.log(`[sendEmailViaMailgun]   - FROM_EMAIL: ${fromEmail}`);
  console.log(`[sendEmailViaMailgun]   - FROM_NAME: ${fromName}`);
  console.log(`[sendEmailViaMailgun]   - APP_URL: ${appUrl}`);

  if (!apiKey || !domain) {
    console.error(`[sendEmailViaMailgun] ERROR: Missing Mailgun credentials`);
    throw new Error("Mailgun API credentials not configured");
  }

  // Build plain text email body
  const textBody = body;

  // Build FormData for Mailgun API
  const formData = new FormData();
  formData.append("from", `${fromName} <${fromEmail}>`);
  formData.append("to", to);

  // Add CC recipients
  if (cc.length > 0) {
    cc.forEach((email) => formData.append("cc", email));
  }

  // Add BCC recipients
  if (bcc.length > 0) {
    bcc.forEach((email) => formData.append("bcc", email));
  }

  formData.append("subject", subject);
  formData.append("text", textBody);
  formData.append("h:Reply-To", replyTo);

  // Add In-Reply-To header for proper email threading
  if (inReplyTo) {
    formData.append("h:In-Reply-To", inReplyTo);
    formData.append("h:References", inReplyTo);
    console.log(
      `[sendEmailViaMailgun] Adding threading headers - In-Reply-To: ${inReplyTo}`
    );
  }

  // Send via Mailgun API
  const mailgunUrl = `https://api.mailgun.net/v3/${domain}/messages`;
  console.log(`[sendEmailViaMailgun] Sending POST request to: ${mailgunUrl}`);

  const startTime = Date.now();
  const response = await fetch(mailgunUrl, {
    method: "POST",
    headers: {
      Authorization: `Basic ${btoa(`api:${apiKey}`)}`,
    },
    body: formData,
  });
  const duration = Date.now() - startTime;

  console.log(
    `[sendEmailViaMailgun] Mailgun response received in ${duration}ms`
  );
  console.log(`[sendEmailViaMailgun]   - status: ${response.status}`);
  console.log(`[sendEmailViaMailgun]   - statusText: ${response.statusText}`);

  if (!response.ok) {
    const errorText = await response.text();
    console.error(
      `[sendEmailViaMailgun] ERROR: Mailgun API error:`,
      response.status,
      errorText
    );

    if (response.status === 401) {
      throw new Error("Mailgun API authentication failed");
    } else if (response.status === 400) {
      throw new Error(`Mailgun API invalid request: ${errorText}`);
    } else if (response.status === 429) {
      throw new Error("Mailgun API rate limit exceeded");
    } else {
      throw new Error(`Mailgun API error: ${response.status} ${errorText}`);
    }
  }

  const responseBody = await response.json();
  console.log(
    `[sendEmailViaMailgun] Success response:`,
    JSON.stringify(responseBody, null, 2)
  );
  console.log(`[sendEmailViaMailgun] Email sent successfully via Mailgun`);
  console.log(`[sendEmailViaMailgun] Message ID: ${responseBody.id}`);

  return { messageId: responseBody.id };
}

Deno.serve(async (req) => {
  const requestId = crypto.randomUUID().substring(0, 8);
  console.log(
    `[${requestId}] ========== SEND-MESSAGE REQUEST START ==========`
  );
  console.log(`[${requestId}] Method: ${req.method}`);
  console.log(`[${requestId}] URL: ${req.url}`);
  console.log(`[${requestId}] Timestamp: ${new Date().toISOString()}`);

  // Handle CORS
  if (req.method === "OPTIONS") {
    console.log(`[${requestId}] Handling CORS preflight request`);
    return new Response("ok", { headers: corsHeaders });
  }

  // Define requestId in outer scope so it's available in catch
  try {
    // Get authenticated user
    const authHeader = req.headers.get("Authorization");
    console.log(`[${requestId}] Auth header present: ${!!authHeader}`);

    if (!authHeader) {
      console.log(`[${requestId}] ERROR: No authorization header`);
      return errorResponse("Unauthorized", 401);
    }

    const supabase = createSupabaseClient();
    const token = authHeader.replace("Bearer ", "");
    console.log(`[${requestId}] Token length: ${token.length}`);

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser(token);

    if (userError || !user) {
      console.log(
        `[${requestId}] ERROR: Auth failed - ${userError?.message || "No user"}`
      );
      return errorResponse("Unauthorized", 401);
    }
    console.log(
      `[${requestId}] Authenticated user: ${user.id} (${user.email})`
    );

    // Parse request body
    const body: SendMessageRequest = await req.json();
    const { petId, to, cc, bcc, message, subject } = body;
    console.log(`[${requestId}] Request body parsed:`);
    console.log(`[${requestId}]   - petId: ${petId}`);
    console.log(`[${requestId}]   - to: ${to}`);
    console.log(`[${requestId}]   - cc: ${cc || "(none)"}`);
    console.log(`[${requestId}]   - bcc: ${bcc || "(none)"}`);
    console.log(`[${requestId}]   - subject: ${subject || "(none)"}`);
    console.log(
      `[${requestId}]   - message length: ${message?.length || 0} chars`
    );

    // Validate required fields
    if (!petId || !to || !message) {
      console.log(
        `[${requestId}] ERROR: Missing required fields - petId: ${!!petId}, to: ${!!to}, message: ${!!message}`
      );
      return errorResponse("Missing required fields", 400);
    }

    // Verify pet belongs to user
    console.log(`[${requestId}] Verifying pet ownership...`);
    const { data: pet, error: petError } = await supabase
      .from("pets")
      .select("id, name, user_id, email_id")
      .eq("id", petId)
      .eq("user_id", user.id)
      .single();

    if (petError || !pet) {
      console.log(
        `[${requestId}] ERROR: Pet verification failed - ${petError?.message || "Pet not found"}`
      );
      return errorResponse("Pet not found or access denied", 404);
    }
    console.log(
      `[${requestId}] Pet verified: ${pet.name} (${pet.id}), email: ${pet.email_id}@${DOMAIN}`
    );

    // Get recipient name from care team (optional)
    console.log(`[${requestId}] Looking up recipient in care team...`);
    const { data: careTeamMember } = await supabase
      .from("vet_information")
      .select("vet_name, clinic_name")
      .eq("email", to.toLowerCase())
      .single();

    const recipientName = careTeamMember?.vet_name || null;
    console.log(
      `[${requestId}] Care team lookup: ${careTeamMember ? `Found - ${recipientName} at ${careTeamMember.clinic_name}` : "Not found (external recipient)"}`
    );

    // Get or create thread
    console.log(`[${requestId}] Getting or creating thread...`);
    const {
      threadId,
      replyToAddress,
      messageId,
      subject: existingSubject,
    } = await getOrCreateThread(
      supabase,
      user.id,
      petId,
      to,
      recipientName,
      `${pet.email_id}@${DOMAIN}`,
      subject || "New Message"
    );
    console.log(`[${requestId}] Thread result:`);
    console.log(`[${requestId}]   - threadId: ${threadId}`);
    console.log(`[${requestId}]   - replyToAddress: ${replyToAddress}`);
    console.log(
      `[${requestId}]   - messageId: ${messageId || "(none - new thread)"}`
    );
    console.log(
      `[${requestId}]   - existingSubject: ${existingSubject || "(none)"}`
    );

    // Determine the email subject
    // If replying to an existing thread and subject doesn't already have RE:, add it
    let emailSubject = subject;
    if (!subject && existingSubject) {
      emailSubject = existingSubject;
      console.log(
        `[${requestId}] Replying to existing thread, subject changed to: ${emailSubject}`
      );
    }
    console.log(`[${requestId}] Final email subject: ${emailSubject}`);

    // Send email via Mailgun
    console.log(`[${requestId}] Sending email via Mailgun...`);
    console.log(`[${requestId}]   - to: ${to}`);
    console.log(`[${requestId}]   - cc: ${cc ? [cc] : "[]"}`);
    console.log(`[${requestId}]   - bcc: ${bcc ? [bcc] : "[]"}`);
    console.log(`[${requestId}]   - replyTo: ${replyToAddress}`);
    console.log(`[${requestId}]   - inReplyTo: ${messageId || "(none)"}`);

    const petEmailAddress = `${pet.email_id}@${DOMAIN}`;
    const { messageId: sentMessageId } = await sendEmailViaMailgun(
      to,
      cc ? [cc] : [],
      bcc ? [bcc] : [],
      subject ? subject : `Re: ${existingSubject}`,
      message,
      replyToAddress,
      pet.name,
      petEmailAddress,
      messageId // Pass message_id for In-Reply-To header
    );
    console.log(`[${requestId}] Email sent successfully via Mailgun`);
    console.log(`[${requestId}] Sent message ID: ${sentMessageId}`);

    // Store message in database
    console.log(`[${requestId}] Storing message in database...`);
    const messageData = {
      thread_id: threadId,
      direction: "outbound",
      sender_email: petEmailAddress,
      recipient_email: to,
      cc: cc ? [cc] : null,
      bcc: bcc ? [bcc] : null,
      subject: emailSubject,
      body: message,
    };
    console.log(
      `[${requestId}] Message data:`,
      JSON.stringify(messageData, null, 2)
    );

    const { data: insertedMessage, error: messageError } = await supabase
      .from("thread_messages")
      .insert(messageData)
      .select()
      .single();

    if (messageError) {
      console.error(`[${requestId}] ERROR storing message:`, messageError);
      // Don't fail the request if email was sent but storage failed
    } else {
      console.log(
        `[${requestId}] Message stored successfully, id: ${insertedMessage?.id}`
      );
    }

    // Update thread updated_at, subject, and message_id
    console.log(`[${requestId}] Updating thread...`);
    const { error: updateError } = await supabase
      .from("message_threads")
      .update({
        updated_at: new Date().toISOString(),
        subject: emailSubject,
        message_id: sentMessageId,
      })
      .eq("id", threadId);

    if (updateError) {
      console.error(`[${requestId}] ERROR updating thread:`, updateError);
    } else {
      console.log(
        `[${requestId}] Thread updated successfully with message_id: ${sentMessageId}`
      );
    }

    console.log(
      `[${requestId}] ========== SEND-MESSAGE REQUEST SUCCESS ==========`
    );
    return jsonResponse({
      success: true,
      threadId,
      replyToAddress,
    });
  } catch (error) {
    console.error(
      `[${requestId}] ========== SEND-MESSAGE REQUEST ERROR ==========`
    );
    console.error(`[${requestId}] Error:`, error);

    // Provide more specific error messages
    let errorMessage = "Internal server error";
    let statusCode = 500;

    if (error instanceof Error) {
      errorMessage = error.message;

      // Handle specific error cases
      if (error.message.includes("AWS SES credentials not configured")) {
        errorMessage =
          "Email service is not configured. Please contact support.";
        statusCode = 503;
      } else if (
        error.message.includes("InvalidParameterValue") ||
        error.message.includes("MessageRejected")
      ) {
        errorMessage =
          "Unable to send email. Please check the recipient email address.";
        statusCode = 400;
      } else if (
        error.message.includes("AccessDenied") ||
        error.message.includes("UnauthorizedOperation")
      ) {
        errorMessage =
          "Email service configuration error. Please contact support.";
        statusCode = 503;
      } else if (
        error.message.includes("Throttling") ||
        error.message.includes("ServiceUnavailable")
      ) {
        errorMessage =
          "Email service is temporarily unavailable. Please try again later.";
        statusCode = 503;
      }
    }

    return errorResponse(errorMessage, statusCode);
  }
});
