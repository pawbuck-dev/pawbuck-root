import type { ParsedAttachment, ParsedEmail } from "./types.ts";

/**
 * Parse Mailgun Store & Forward webhook data to ParsedEmail format
 * Mailgun sends emails as multipart/form-data with the following fields:
 * - sender: From address
 * - recipient: To address
 * - subject: Email subject
 * - body-plain: Plain text body
 * - body-html: HTML body
 * - Date: Email date
 * - Message-Id: Unique message identifier
 * - attachment-1, attachment-2, etc.: File attachments
 */
export async function parseMailgunWebhook(
  formData: FormData
): Promise<ParsedEmail> {
  console.log("Parsing Mailgun webhook data");

  // Extract email metadata
  const sender = formData.get("sender")?.toString() || formData.get("from")?.toString();
  const recipient = formData.get("recipient")?.toString() || formData.get("To")?.toString();
  const subject = formData.get("subject")?.toString() || formData.get("Subject")?.toString() || "";
  const bodyPlain = formData.get("body-plain")?.toString() || formData.get("stripped-text")?.toString();
  const bodyHtml = formData.get("body-html")?.toString() || formData.get("stripped-html")?.toString();
  const date = formData.get("Date")?.toString();
  const messageId = formData.get("Message-Id")?.toString();

  console.log("Mailgun email metadata:", {
    sender,
    recipient,
    subject,
    messageId,
    date,
  });

  // Parse sender email address
  const from = parseSenderAddress(sender);

  // Parse recipient email addresses
  const to = parseRecipientAddresses(recipient);

  // Parse CC addresses (Mailgun may include these)
  const ccField = formData.get("Cc")?.toString();
  const cc = parseRecipientAddresses(ccField);

  // Extract attachments
  const attachments = await extractAttachments(formData);

  const parsedEmail: ParsedEmail = {
    from,
    to,
    cc,
    subject,
    date: date || null,
    messageId: messageId || null,
    textBody: bodyPlain || null,
    htmlBody: bodyHtml || null,
    attachments,
  };

  console.log("Mailgun email parsed successfully:", {
    from: from?.address,
    to: to.map((t) => t.address),
    subject,
    attachmentCount: attachments.length,
  });

  return parsedEmail;
}

/**
 * Parse sender address into name and address
 * Mailgun format: "John Doe <john@example.com>" or just "john@example.com"
 */
function parseSenderAddress(
  sender: string | undefined | null
): { name: string; address: string } | null {
  if (!sender) {
    return null;
  }

  // Try to extract name and address from format "Name <email>"
  const match = sender.match(/^(.+?)\s*<(.+?)>$/);
  if (match) {
    return {
      name: match[1].trim(),
      address: match[2].trim(),
    };
  }

  // If no brackets, assume it's just an email address
  return {
    name: "",
    address: sender.trim(),
  };
}

/**
 * Parse recipient addresses (can be comma-separated)
 * Mailgun format: "john@example.com" or "John <john@example.com>, Jane <jane@example.com>"
 */
function parseRecipientAddresses(
  recipients: string | undefined | null
): { name: string; address: string }[] {
  if (!recipients) {
    return [];
  }

  // Split by comma if multiple recipients
  const recipientList = recipients.split(",").map((r) => r.trim());

  return recipientList
    .map((recipient) => {
      // Try to extract name and address from format "Name <email>"
      const match = recipient.match(/^(.+?)\s*<(.+?)>$/);
      if (match) {
        return {
          name: match[1].trim(),
          address: match[2].trim(),
        };
      }

      // If no brackets, assume it's just an email address
      return {
        name: "",
        address: recipient.trim(),
      };
    })
    .filter((r) => r.address); // Filter out invalid addresses
}

/**
 * Extract attachments from Mailgun FormData
 * Mailgun sends attachments as attachment-1, attachment-2, etc.
 */
async function extractAttachments(
  formData: FormData
): Promise<ParsedAttachment[]> {
  const attachments: ParsedAttachment[] = [];
  let index = 1;

  console.log("Extracting attachments from Mailgun webhook");

  // Iterate through all possible attachment fields
  // Mailgun uses attachment-1, attachment-2, etc.
  while (true) {
    const attachmentKey = `attachment-${index}`;
    const attachment = formData.get(attachmentKey);

    if (!attachment) {
      // Also check for attachment-count field to know when to stop
      // If we've checked a few and found nothing, assume we're done
      if (index > 1) {
        break;
      }
      index++;
      if (index > 20) break; // Safety limit
      continue;
    }

    if (attachment instanceof File) {
      try {
        console.log(`Processing attachment-${index}: ${attachment.name}`);

        // Read file content as ArrayBuffer
        const arrayBuffer = await attachment.arrayBuffer();
        const uint8Array = new Uint8Array(arrayBuffer);

        // Convert to base64
        const base64Content = arrayBufferToBase64(uint8Array);

        const parsedAttachment: ParsedAttachment = {
          filename: attachment.name || `attachment-${index}`,
          mimeType: attachment.type || "application/octet-stream",
          size: attachment.size,
          content: base64Content,
        };

        attachments.push(parsedAttachment);
        console.log(
          `Successfully processed attachment: ${parsedAttachment.filename} (${parsedAttachment.mimeType}), size: ${parsedAttachment.size} bytes`
        );
      } catch (error) {
        console.error(`Error processing attachment-${index}:`, error);
      }
    }

    index++;
    if (index > 20) break; // Safety limit
  }

  console.log(`Extracted ${attachments.length} attachment(s) from Mailgun webhook`);
  return attachments;
}

/**
 * Convert Uint8Array to base64 string
 */
function arrayBufferToBase64(uint8Array: Uint8Array): string {
  const binary = Array.from(uint8Array)
    .map((byte) => String.fromCharCode(byte))
    .join("");
  return btoa(binary);
}

/**
 * Extract Message-Id from parsed email for idempotency
 */
export function extractMessageId(parsedEmail: ParsedEmail): string | null {
  return parsedEmail.messageId;
}

