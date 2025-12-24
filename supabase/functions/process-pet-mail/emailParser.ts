import PostalMime from "postal-mime";
import { processAttachments } from "./attachmentProcessor.ts";
import type { ParsedEmail } from "./types.ts";

/**
 * Parses raw email data and extracts all information including attachments
 */
export async function parseEmail(rawEmail: Uint8Array): Promise<ParsedEmail> {
  console.log("Parsing email with postal-mime");

  const parser = new PostalMime();
  const email = await parser.parse(rawEmail);

  console.log("Email parsed successfully");
  console.log("From:", email.from);
  console.log("To:", email.to);
  console.log("Cc:", email.cc);
  console.log("Subject:", email.subject);
  console.log("Attachments:", email.attachments?.length || 0);

  // Process attachments
  const attachments = processAttachments(email.attachments);

  // Build parsed email response
  const parsedEmail: ParsedEmail = {
    from:
      email.from && email.from.address
        ? { name: email.from.name || "", address: email.from.address }
        : null,
    to: (email.to || [])
      .filter((t) => t.address)
      .map((t) => ({
        name: t.name || "",
        address: t.address!,
      })),
    cc: (email.cc || [])
      .filter((c) => c.address)
      .map((c) => ({
        name: c.name || "",
        address: c.address!,
      })),
    subject: email.subject || "",
    date: email.date || null,
    messageId: email.messageId || null,
    textBody: email.text || null,
    htmlBody: email.html || null,
    attachments,
  };

  return parsedEmail;
}
