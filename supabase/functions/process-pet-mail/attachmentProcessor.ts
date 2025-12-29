import type { ParsedAttachment } from "./types.ts";

/**
 * Converts attachment content to base64 string
 */
function contentToBase64(content: any): string {
  if (content instanceof Uint8Array) {
    // Convert Uint8Array to base64
    const binary = Array.from(content)
      .map((byte) => String.fromCharCode(byte))
      .join("");
    return btoa(binary);
  }

  if (content instanceof ArrayBuffer) {
    // Convert ArrayBuffer to base64
    const uint8Array = new Uint8Array(content);
    const binary = Array.from(uint8Array)
      .map((byte) => String.fromCharCode(byte))
      .join("");
    return btoa(binary);
  }

  if (typeof content === "string") {
    // If already a string, encode it
    return btoa(content);
  }

  if (content && typeof content === "object") {
    // Try to convert object to Uint8Array
    const uint8Array = new Uint8Array(Object.values(content));
    const binary = Array.from(uint8Array)
      .map((byte) => String.fromCharCode(byte))
      .join("");
    return btoa(binary);
  }

  throw new Error("Unknown content type");
}

/**
 * Gets the size of attachment content
 */
function getContentSize(content: any): number {
  if (content?.length !== undefined) {
    return content.length;
  }
  if (content?.byteLength !== undefined) {
    return content.byteLength;
  }
  return 0;
}

/**
 * Processes a single attachment and converts it to ParsedAttachment
 */
export function processAttachment(attachment: any): ParsedAttachment {
  const content = attachment.content;

  console.log(`Processing attachment: ${attachment.filename}`);
  console.log(`Content type: ${typeof content}`);
  console.log(`Content constructor: ${content?.constructor?.name}`);

  const base64Content = contentToBase64(content);
  const size = getContentSize(content);

  const parsedAttachment: ParsedAttachment = {
    filename: attachment.filename || "unnamed",
    mimeType: attachment.mimeType || "application/octet-stream",
    size,
    content: base64Content,
  };

  console.log(
    `Successfully processed attachment: ${parsedAttachment.filename} (${parsedAttachment.mimeType}), size: ${size} bytes`
  );

  return parsedAttachment;
}

/**
 * Processes all attachments from email
 */
export function processAttachments(
  emailAttachments: any[] | undefined
): ParsedAttachment[] {
  const attachments: ParsedAttachment[] = [];

  if (!emailAttachments || emailAttachments.length === 0) {
    console.log("No attachments found in email");
    return attachments;
  }

  console.log(`Processing ${emailAttachments.length} attachment(s)`);

  for (const attachment of emailAttachments) {
    try {
      const parsedAttachment = processAttachment(attachment);
      attachments.push(parsedAttachment);
    } catch (attachmentError) {
      console.error(
        `Error processing attachment ${attachment.filename}:`,
        attachmentError
      );
      // Continue processing other attachments
    }
  }

  return attachments;
}



