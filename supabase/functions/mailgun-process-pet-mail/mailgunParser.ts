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
  const sender =
    formData.get("sender")?.toString() || formData.get("from")?.toString();
  const recipient =
    formData.get("recipient")?.toString() || formData.get("To")?.toString();
  const subject =
    formData.get("subject")?.toString() ||
    formData.get("Subject")?.toString() ||
    "";
  const bodyPlain =
    formData.get("body-plain")?.toString() ||
    formData.get("stripped-text")?.toString();
  const bodyHtml =
    formData.get("body-html")?.toString() ||
    formData.get("stripped-html")?.toString();
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
 * Fetch attachment from Mailgun storage URL
 */
async function fetchMailgunAttachment(
  storageUrl: string,
  filename: string
): Promise<ParsedAttachment | null> {
  const mailgunApiKey = Deno.env.get("MAILGUN_API_KEY");
  if (!mailgunApiKey) {
    console.error("MAILGUN_API_KEY not configured");
    return null;
  }

  try {
    console.log(`Fetching attachment from Mailgun storage: ${filename}`);

    const auth = btoa(`api:${mailgunApiKey}`);
    const response = await fetch(storageUrl, {
      method: "GET",
      headers: {
        Authorization: `Basic ${auth}`,
      },
    });

    console.log("Response:", response);
    console.log("storageUrl:", storageUrl);
    console.log("filename:", filename);
    console.log("auth:", auth);

    if (!response.ok) {
      console.error(
        `Failed to fetch attachment from Mailgun: ${response.status} ${response.statusText}`
      );
      return null;
    }

    // Get content type from response headers
    const contentType =
      response.headers.get("content-type") || "application/octet-stream";

    // Get file content as ArrayBuffer
    const arrayBuffer = await response.arrayBuffer();
    const uint8Array = new Uint8Array(arrayBuffer);

    // Convert to base64
    const base64Content = arrayBufferToBase64(uint8Array);

    console.log(
      `Successfully fetched attachment: ${filename} (${contentType}), size: ${uint8Array.length} bytes`
    );

    return {
      filename,
      mimeType: contentType,
      size: uint8Array.length,
      content: base64Content,
    };
  } catch (error) {
    console.error(`Error fetching attachment from Mailgun storage:`, error);
    return null;
  }
}

/**
 * Extract attachments from Mailgun FormData
 * Mailgun sends attachments in an "attachments" key as a JSON array string
 * Format: [{"url": "...", "content-type": "...", "name": "...", "size": ...}]
 */
async function extractAttachments(
  formData: FormData
): Promise<ParsedAttachment[]> {
  const attachments: ParsedAttachment[] = [];

  console.log("Extracting attachments from Mailgun webhook");

  // Get the attachments JSON string
  const attachmentsJson = formData.get("attachments")?.toString();

  if (!attachmentsJson) {
    console.log("No attachments field found in formData");
    return attachments;
  }

  try {
    // Parse the JSON array
    const attachmentsArray = JSON.parse(attachmentsJson) as {
      url: string;
      "content-type": string;
      name: string;
      size: number;
    }[];

    console.log(`Found ${attachmentsArray.length} attachment(s) in JSON`);

    // Process each attachment
    for (let i = 0; i < attachmentsArray.length; i++) {
      const attachmentInfo = attachmentsArray[i];

      try {
        console.log(
          `Processing attachment ${i + 1}: ${attachmentInfo.name} (${attachmentInfo["content-type"]}), size: ${attachmentInfo.size} bytes`
        );

        // Fetch the attachment from Mailgun storage URL
        const fetchedAttachment = await fetchMailgunAttachment(
          attachmentInfo.url,
          attachmentInfo.name
        );

        if (fetchedAttachment) {
          // Override with metadata from Mailgun if available
          fetchedAttachment.mimeType =
            attachmentInfo["content-type"] || fetchedAttachment.mimeType;
          fetchedAttachment.size =
            attachmentInfo.size || fetchedAttachment.size;
          attachments.push(fetchedAttachment);
        }
      } catch (error) {
        console.error(
          `Error processing attachment ${i + 1} (${attachmentInfo.name}):`,
          error
        );
      }
    }
  } catch (parseError) {
    console.error("Error parsing attachments JSON:", parseError);
    console.error("Attachments value:", attachmentsJson);
  }

  console.log(
    `Extracted ${attachments.length} attachment(s) from Mailgun webhook`
  );
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
