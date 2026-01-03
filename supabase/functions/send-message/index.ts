// supabase/functions/send-message/index.ts
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createSupabaseClient } from "../_shared/supabase-utils.ts";
import { corsHeaders, jsonResponse, errorResponse } from "../_shared/cors.ts";
import { SESClient, SendEmailCommand } from "npm:@aws-sdk/client-ses@3";

interface SendMessageRequest {
  petId: string;
  to: string;
  cc?: string;
  bcc?: string;
  subject: string;
  message: string;
}

// Generate unique reply-to address for thread
function generateReplyToAddress(threadId: string, domain: string): string {
  // Use thread ID and a short hash for uniqueness
  const hash = threadId.substring(0, 8).replace(/-/g, "");
  return `thread-${hash}@${domain}`;
}

// Generate or get existing thread ID
async function getOrCreateThread(
  supabase: any,
  userId: string,
  petId: string,
  recipientEmail: string,
  recipientName: string | null,
  subject: string
): Promise<{ threadId: string; replyToAddress: string }> {
  // Check if thread exists (by recipient email and pet)
  const { data: existingThread } = await supabase
    .from("message_threads")
    .select("id, reply_to_address")
    .eq("pet_id", petId)
    .eq("user_id", userId)
    .eq("recipient_email", recipientEmail.toLowerCase())
    .single();

  if (existingThread) {
    return {
      threadId: existingThread.id,
      replyToAddress: existingThread.reply_to_address,
    };
  }

  // Create new thread
  const domain = Deno.env.get("EMAIL_DOMAIN") || "pawbuck.app";
  const newThreadId = crypto.randomUUID();
  const replyToAddress = generateReplyToAddress(newThreadId, domain);

  const { data: newThread, error } = await supabase
    .from("message_threads")
    .insert({
      pet_id: petId,
      user_id: userId,
      recipient_email: recipientEmail.toLowerCase(),
      recipient_name: recipientName,
      reply_to_address: replyToAddress,
      subject: subject,
    })
    .select()
    .single();

  if (error) throw error;

  return {
    threadId: newThread.id,
    replyToAddress: newThread.reply_to_address,
  };
}

// Send email via AWS SES
async function sendEmailViaSES(
  to: string,
  cc: string[],
  bcc: string[],
  subject: string,
  body: string,
  replyTo: string,
  petName: string
): Promise<void> {
  const accessKeyId = Deno.env.get("AWS_SES_ACCESS_KEY_ID");
  const secretAccessKey = Deno.env.get("AWS_SES_SECRET_ACCESS_KEY");
  const region = Deno.env.get("AWS_SES_REGION") || "us-east-1";
  const fromEmail = Deno.env.get("SES_FROM_EMAIL") || "support@pawbuck.app";
  const fromName = Deno.env.get("SES_FROM_NAME") || "PetApp Chat";
  const appUrl = Deno.env.get("APP_URL") || "https://app.pawbuck.app";

  if (!accessKeyId || !secretAccessKey) {
    throw new Error("AWS SES credentials not configured");
  }

  const sesClient = new SESClient({
    region,
    credentials: {
      accessKeyId,
      secretAccessKey,
    },
  });

  // Build email body with HTML
  const htmlBody = `
    <!DOCTYPE html>
    <html>
      <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
        <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
          <p>${body.replace(/\n/g, "<br>")}</p>
          <hr style="margin: 30px 0; border: none; border-top: 1px solid #eee;">
          <p style="font-size: 12px; color: #666;">
            This message is about ${petName}. 
            <a href="${appUrl}/messages">View in app</a>
          </p>
        </div>
      </body>
    </html>
  `;

  const textBody = `${body}\n\n---\nThis message is about ${petName}. View in app: ${appUrl}/messages`;

  const command = new SendEmailCommand({
    Source: `${fromName} <${fromEmail}>`,
    Destination: {
      ToAddresses: [to],
      CcAddresses: cc.length > 0 ? cc : undefined,
      BccAddresses: bcc.length > 0 ? bcc : undefined,
    },
    ReplyToAddresses: [replyTo],
    Message: {
      Subject: {
        Data: subject,
        Charset: "UTF-8",
      },
      Body: {
        Html: {
          Data: htmlBody,
          Charset: "UTF-8",
        },
        Text: {
          Data: textBody,
          Charset: "UTF-8",
        },
      },
    },
  });

  await sesClient.send(command);
}

Deno.serve(async (req) => {
  // Handle CORS
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // Get authenticated user
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return errorResponse("Unauthorized", 401);
    }

    const supabase = createSupabaseClient();
    const token = authHeader.replace("Bearer ", "");

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser(token);

    if (userError || !user) {
      return errorResponse("Unauthorized", 401);
    }

    // Parse request body
    const body: SendMessageRequest = await req.json();
    const { petId, to, cc, bcc, subject, message } = body;

    // Validate required fields
    if (!petId || !to || !subject || !message) {
      return errorResponse("Missing required fields", 400);
    }

    // Verify pet belongs to user
    const { data: pet, error: petError } = await supabase
      .from("pets")
      .select("id, name, user_id")
      .eq("id", petId)
      .eq("user_id", user.id)
      .single();

    if (petError || !pet) {
      return errorResponse("Pet not found or access denied", 404);
    }

    // Get recipient name from care team (optional)
    const { data: careTeamMember } = await supabase
      .from("vet_information")
      .select("vet_name, clinic_name")
      .eq("email", to.toLowerCase())
      .single();

    const recipientName = careTeamMember?.vet_name || null;

    // Get or create thread
    const { threadId, replyToAddress } = await getOrCreateThread(
      supabase,
      user.id,
      petId,
      to,
      recipientName,
      subject
    );

    // Send email via SES
    await sendEmailViaSES(
      to,
      cc ? [cc] : [],
      bcc ? [bcc] : [],
      subject,
      message,
      replyToAddress,
      pet.name
    );

    // Store message in database
    const fromEmail = Deno.env.get("SES_FROM_EMAIL") || "support@pawbuck.app";
    const { error: messageError } = await supabase
      .from("thread_messages")
      .insert({
        thread_id: threadId,
        direction: "outbound",
        sender_email: user.email || fromEmail,
        recipient_email: to,
        cc: cc ? [cc] : null,
        bcc: bcc ? [bcc] : null,
        subject: subject,
        body: message,
      });

    if (messageError) {
      console.error("Error storing message:", messageError);
      // Don't fail the request if email was sent but storage failed
    }

    // Update thread updated_at
    await supabase
      .from("message_threads")
      .update({ updated_at: new Date().toISOString() })
      .eq("id", threadId);

    return jsonResponse({
      success: true,
      threadId,
      replyToAddress,
    });
  } catch (error) {
    console.error("Error sending message:", error);
    
    // Provide more specific error messages
    let errorMessage = "Internal server error";
    let statusCode = 500;
    
    if (error instanceof Error) {
      errorMessage = error.message;
      
      // Handle specific error cases
      if (error.message.includes("AWS SES credentials not configured")) {
        errorMessage = "Email service is not configured. Please contact support.";
        statusCode = 503;
      } else if (error.message.includes("InvalidParameterValue") || error.message.includes("MessageRejected")) {
        errorMessage = "Unable to send email. Please check the recipient email address.";
        statusCode = 400;
      } else if (error.message.includes("AccessDenied") || error.message.includes("UnauthorizedOperation")) {
        errorMessage = "Email service configuration error. Please contact support.";
        statusCode = 503;
      } else if (error.message.includes("Throttling") || error.message.includes("ServiceUnavailable")) {
        errorMessage = "Email service is temporarily unavailable. Please try again later.";
        statusCode = 503;
      }
    }
    
    return errorResponse(errorMessage, statusCode);
  }
});

