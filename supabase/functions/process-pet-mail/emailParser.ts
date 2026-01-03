import PostalMime from "postal-mime";
import { processAttachments } from "./attachmentProcessor.ts";
import { cleanEmailReply } from "./emailCleaner.ts";
import type { ParsedEmail } from "./types.ts";

/**
 * Parses raw email data and extracts all information including attachments
 * Automatically cleans quoted/replied text from email bodies for clean chat UI
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

  // Clean email bodies to remove quoted/replied text
  // This is critical for bidirectional messaging - vets often include entire previous threads
  const { cleanedText, cleanedHtml } = cleanEmailReply(
    email.text || null,
    email.html || null
  );

  console.log(
    `Email body cleaned: text length ${email.text?.length || 0} -> ${cleanedText.length}, html length ${email.html?.length || 0} -> ${cleanedHtml?.length || 0}`
  );

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
    textBody: cleanedText || null,
    htmlBody: cleanedHtml || null,
    attachments,
  };

  return parsedEmail;
}
