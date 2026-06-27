import type { ParsedAttachment, ParsedEmail } from "./types.ts";
import { parseMailgunAttachmentCountField } from "../_shared/email-health-ingestion/emailAttachmentSignals.ts";

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
    subject: subject?.replace(/^re:\s*/i, ""),
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
  const mailgunAttachmentCountField = parseMailgunAttachmentCountField(
    formData.get("attachment-count")?.toString(),
  );
  const { attachments, diagnostics } = await extractAttachments(formData);

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
    attachmentDiagnostics: {
      ...diagnostics,
      mailgunAttachmentCountField,
    },
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

    if (!response.ok) {
      console.error(
        `Failed to fetch attachment from Mailgun: ${response.status} ${response.statusText}`,
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
 * Extract attachments from Mailgun FormData.
 * 1) JSON `attachments` field + fetch from Mailgun storage (production path)
 * 2) Fallback: inline `attachment-1`, `attachment-2`, … form file fields
 */
async function extractAttachments(
  formData: FormData,
): Promise<{
  attachments: ParsedAttachment[];
  diagnostics: {
    mailgunJsonListed: number;
    mailgunFetchFailures: number;
    inlineFormExtracted: number;
  };
}> {
  const attachments: ParsedAttachment[] = [];
  let mailgunJsonListed = 0;
  let mailgunFetchFailures = 0;

  console.log("Extracting attachments from Mailgun webhook");

  const attachmentsJson = formData.get("attachments")?.toString();

  if (attachmentsJson) {
    try {
      const attachmentsArray = JSON.parse(attachmentsJson) as {
        url: string;
        "content-type": string;
        name: string;
        size: number;
      }[];

      mailgunJsonListed = attachmentsArray.length;
      console.log(`Found ${mailgunJsonListed} attachment(s) in JSON`);

      for (let i = 0; i < attachmentsArray.length; i++) {
        const attachmentInfo = attachmentsArray[i];

        try {
          console.log(
            `Processing attachment ${i + 1}: ${attachmentInfo.name} (${attachmentInfo["content-type"]}), size: ${attachmentInfo.size} bytes`,
          );

          const fetchedAttachment = await fetchMailgunAttachment(
            attachmentInfo.url,
            attachmentInfo.name,
          );

          if (fetchedAttachment) {
            fetchedAttachment.mimeType =
              attachmentInfo["content-type"] || fetchedAttachment.mimeType;
            fetchedAttachment.size =
              attachmentInfo.size || fetchedAttachment.size;
            attachments.push(fetchedAttachment);
          } else {
            mailgunFetchFailures++;
          }
        } catch (error) {
          mailgunFetchFailures++;
          console.error(
            `Error processing attachment ${i + 1} (${attachmentInfo.name}):`,
            error,
          );
        }
      }
    } catch (parseError) {
      console.error("Error parsing attachments JSON:", parseError);
      console.error("Attachments value:", attachmentsJson);
    }
  } else {
    console.log("No attachments JSON field found in formData");
  }

  let inlineFormExtracted = 0;
  if (attachments.length === 0) {
    const inline = await extractInlineFormAttachments(formData);
    inlineFormExtracted = inline.length;
    attachments.push(...inline);
    if (inlineFormExtracted > 0) {
      console.log(
        `Extracted ${inlineFormExtracted} attachment(s) from inline attachment-N form fields`,
      );
    }
  }

  console.log(
    `Extracted ${attachments.length} attachment(s) from Mailgun webhook (jsonListed=${mailgunJsonListed}, fetchFailures=${mailgunFetchFailures}, inline=${inlineFormExtracted})`,
  );

  return {
    attachments,
    diagnostics: {
      mailgunJsonListed,
      mailgunFetchFailures,
      inlineFormExtracted,
    },
  };
}

async function extractInlineFormAttachments(
  formData: FormData,
): Promise<ParsedAttachment[]> {
  const attachments: ParsedAttachment[] = [];
  const keys = [...formData.keys()]
    .filter((k) => /^attachment-\d+$/i.test(k))
    .sort((a, b) => {
      const na = Number.parseInt(a.split("-")[1] ?? "0", 10);
      const nb = Number.parseInt(b.split("-")[1] ?? "0", 10);
      return na - nb;
    });

  for (const key of keys) {
    const value = formData.get(key);
    if (!value || typeof value === "string") continue;

    try {
      const file = value as File;
      const arrayBuffer = await file.arrayBuffer();
      const uint8Array = new Uint8Array(arrayBuffer);
      const filename = file.name?.trim() || key;
      const mimeType = file.type?.trim() || "application/octet-stream";

      attachments.push({
        filename,
        mimeType,
        size: uint8Array.length,
        content: arrayBufferToBase64(uint8Array),
      });
    } catch (error) {
      console.error(`Error reading inline form attachment ${key}:`, error);
    }
  }

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
