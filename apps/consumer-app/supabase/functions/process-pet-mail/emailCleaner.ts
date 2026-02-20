/**
 * Email Reply Cleaner
 * 
 * Removes quoted/replied text from email bodies to extract only the new message content.
 * This is critical for bidirectional messaging - vets often include entire previous threads.
 * 
 * Handles various email client formats:
 * - Plain text quotes (lines starting with >, |, etc.)
 * - HTML blockquotes and styled quoted sections
 * - Original message headers (From:, To:, Subject:, Date:, etc.)
 * - Common reply separators (-----Original Message-----, etc.)
 * - Multi-language reply patterns
 */

/**
 * Removes quoted text from plain text email body
 */
export function cleanPlainTextEmail(body: string): string {
  if (!body) return "";

  let cleaned = body;

  // First, try to find common reply separators and take everything before them
  const separators = [
    /-----Original Message-----/i,
    /-{5,}.*Original.*Message.*-{5,}/i,
    /-{3,}.*Original.*Message.*-{3,}/i,
    /From:\s*.+Sent:\s*.+To:/i,
    /De:\s*.+Envoyé\s*:.*À\s*:/i, // French
    /Von:\s*.+Gesendet:\s*.+An\s*:/i, // German
  ];

  // If we find a separator, take content before it (this is usually the new message)
  for (const separator of separators) {
    const match = cleaned.search(separator);
    if (match > 50) { // Only if separator is not at the very beginning
      cleaned = cleaned.substring(0, match);
      break;
    }
  }

  // Remove common "On [date], [person] wrote:" patterns
  const replyPatterns = [
    /\n\s*On\s+.+\s+wrote\s*:.*$/smi,
    /\n\s*Le\s+.+\s+a\s+écrit\s*:.*$/smi, // French
    /\n\s*Am\s+.+\s+schrieb\s+.+\s*:.*$/smi, // German
    /\n\s*El\s+.+\s+escribió\s*:.*$/smi, // Spanish
    /\n\s*From:\s*.+Sent:\s*.+To:\s*.+Subject:\s*.*$/smi,
    /\n\s*_{5,}.*$/smi, // Multiple underscores
    /\n\s*={5,}.*$/smi, // Multiple equals
  ];

  replyPatterns.forEach((pattern) => {
    cleaned = cleaned.replace(pattern, "");
  });

  // Process line by line to remove quoted content
  const lines = cleaned.split("\n");
  const cleanedLines: string[] = [];
  let inQuotedSection = false;
  let foundNewContent = false;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmedLine = line.trim();

    // Skip empty lines if we're in a quoted section
    if (inQuotedSection && trimmedLine === "") {
      continue;
    }

    // Check if this line starts a quoted section
    // Common markers: >, |, :, or email headers
    const isQuoteMarker =
      trimmedLine.startsWith(">") ||
      trimmedLine.startsWith("|") ||
      (trimmedLine.startsWith(":") && trimmedLine.length > 1 && !trimmedLine.match(/^:\s*[a-z]/i)) ||
      /^From:\s*/i.test(trimmedLine) ||
      /^To:\s*/i.test(trimmedLine) ||
      /^Subject:\s*/i.test(trimmedLine) ||
      /^Date:\s*/i.test(trimmedLine) ||
      /^Sent:\s*/i.test(trimmedLine) ||
      /^Cc:\s*/i.test(trimmedLine) ||
      /^Bcc:\s*/i.test(trimmedLine) ||
      /^Reply-To:\s*/i.test(trimmedLine);

    if (isQuoteMarker) {
      inQuotedSection = true;
      continue;
    }

    // If we hit a non-quoted line after being in a quoted section,
    // check if it's actually new content or still quoted
    if (inQuotedSection) {
      // If the line looks like normal text (not a header), exit quoted section
      if (trimmedLine !== "" && !/^[A-Z][a-z]+:\s/.test(trimmedLine)) {
        inQuotedSection = false;
        cleanedLines.push(line);
        foundNewContent = true;
      }
    } else {
      cleanedLines.push(line);
      if (trimmedLine !== "") {
        foundNewContent = true;
      }
    }
  }

  cleaned = cleanedLines.join("\n");

  // Remove excessive blank lines (more than 2 consecutive)
  cleaned = cleaned.replace(/\n{3,}/g, "\n\n");

  // Trim whitespace
  cleaned = cleaned.trim();

  // If we didn't find much content, the original cleaning might have been too aggressive
  // Return at least something if we have it
  if (!foundNewContent && body.trim().length > 0) {
    // Fallback: return first 500 chars as a safety measure
    return body.trim().substring(0, 500);
  }

  return cleaned;
}

/**
 * Removes quoted text from HTML email body
 */
export function cleanHtmlEmail(html: string): string {
  if (!html) return "";

  let cleaned = html;

  // Remove blockquote tags and their content (most common quoted format)
  cleaned = cleaned.replace(/<blockquote[^>]*>[\s\S]*?<\/blockquote>/gi, "");

  // Remove divs with quote-related classes
  cleaned = cleaned.replace(
    /<div[^>]*class=["'][^"']*\bquote[^"']*\b[^"']*["'][^>]*>[\s\S]*?<\/div>/gi,
    ""
  );

  // Remove elements with quote-related styling
  cleaned = cleaned.replace(
    /<[^>]+style=["'][^"']*border-left[^"']*["'][^>]*>[\s\S]*?<\/[^>]+>/gi,
    ""
  );

  // Remove common reply separators in HTML
  const separatorPatterns = [
    /<div[^>]*>[\s\S]*?-----Original Message-----[\s\S]*?<\/div>/gi,
    /<p[^>]*>[\s\S]*?-----Original Message-----[\s\S]*?<\/p>/gi,
    /<hr[^>]*>[\s\S]*?(?=<[^>]+>|$)/gi,
  ];

  separatorPatterns.forEach((pattern) => {
    cleaned = cleaned.replace(pattern, "");
  });

  // Remove common reply headers in HTML
  const headerPatterns = [
    /<p[^>]*>[\s\S]*?From:\s*[\s\S]*?<\/p>/gi,
    /<div[^>]*>[\s\S]*?From:\s*[\s\S]*?<\/div>/gi,
    /<p[^>]*>[\s\S]*?To:\s*[\s\S]*?<\/p>/gi,
    /<div[^>]*>[\s\S]*?To:\s*[\s\S]*?<\/div>/gi,
    /<p[^>]*>[\s\S]*?Subject:\s*[\s\S]*?<\/p>/gi,
    /<div[^>]*>[\s\S]*?Subject:\s*[\s\S]*?<\/div>/gi,
    /<p[^>]*>[\s\S]*?On\s+.+\s+wrote[\s\S]*?<\/p>/gi,
    /<div[^>]*>[\s\S]*?On\s+.+\s+wrote[\s\S]*?<\/div>/gi,
  ];

  headerPatterns.forEach((pattern) => {
    cleaned = cleaned.replace(pattern, "");
  });

  // Clean up excessive whitespace
  cleaned = cleaned.replace(/\s{3,}/g, " ");
  cleaned = cleaned.replace(/<p[^>]*>\s*<\/p>/gi, "");
  cleaned = cleaned.replace(/<div[^>]*>\s*<\/div>/gi, "");

  return cleaned.trim();
}

/**
 * Smart cleaner that detects and removes quoted content
 * Prefers plain text cleaning for better accuracy
 */
export function cleanEmailReply(
  textBody: string | null,
  htmlBody: string | null
): { cleanedText: string; cleanedHtml: string | null } {
  // Prefer text body for cleaning (more reliable for quote detection)
  let cleanedText = textBody ? cleanPlainTextEmail(textBody) : "";
  let cleanedHtml: string | null = null;

  if (htmlBody) {
    cleanedHtml = cleanHtmlEmail(htmlBody);
    
    // If text cleaning resulted in empty content but HTML has content,
    // try extracting text from HTML as fallback
    if (!cleanedText && cleanedHtml) {
      // Simple HTML tag removal for text extraction
      const textFromHtml = cleanedHtml
        .replace(/<[^>]+>/g, " ")
        .replace(/\s+/g, " ")
        .trim();
      if (textFromHtml.length > 20) {
        cleanedText = textFromHtml;
      }
    }
  }

  return {
    cleanedText: cleanedText || textBody || "",
    cleanedHtml: cleanedHtml || htmlBody || null,
  };
}

