import {
  attachmentLooksLikeHealthDocument,
  emailLikelyHadHealthAttachment,
  emailLooksLikeUnclassifiedHealthAttempt,
  formatMissingAttachmentFailureReason,
  isMissingAttachmentFailureReason,
  parseMailgunAttachmentCountField,
  shouldTreatAsMissingAttachment,
  summarizeMissingAttachmentFailure,
} from "./emailAttachmentSignals.ts";
import { assertEquals } from "jsr:@std/assert@1";

Deno.test("emailLikelyHadHealthAttachment detects vaccine subjects", () => {
  assertEquals(emailLikelyHadHealthAttachment("Vaccines Docuemnts.", null), true);
  assertEquals(
    emailLikelyHadHealthAttachment("Vaccination Certificate For Milo", null),
    true,
  );
  assertEquals(emailLikelyHadHealthAttachment("Milo Records.", null), true);
  assertEquals(emailLikelyHadHealthAttachment(null, "attached the docuemnt"), true);
});

Deno.test("emailLikelyHadHealthAttachment ignores plain check-ins", () => {
  assertEquals(emailLikelyHadHealthAttachment("Hello", "See you tomorrow"), false);
});

Deno.test("shouldTreatAsMissingAttachment when Mailgun JSON listed files", () => {
  assertEquals(
    shouldTreatAsMissingAttachment({
      extractedCount: 0,
      mailgunJsonListed: 1,
      mailgunAttachmentCountField: null,
      subject: "Hi",
      textBody: "Thanks",
    }),
    true,
  );
});

Deno.test("shouldTreatAsMissingAttachment when attachment-count field set", () => {
  assertEquals(
    shouldTreatAsMissingAttachment({
      extractedCount: 0,
      mailgunJsonListed: 0,
      mailgunAttachmentCountField: 1,
      subject: "Certificate",
      textBody: "Please see attached",
    }),
    true,
  );
});

Deno.test("parseMailgunAttachmentCountField", () => {
  assertEquals(parseMailgunAttachmentCountField("2"), 2);
  assertEquals(parseMailgunAttachmentCountField(""), null);
});

Deno.test("missing attachment failure reason helpers", () => {
  const reason = formatMissingAttachmentFailureReason("Mailgun fetch failed");
  assertEquals(isMissingAttachmentFailureReason(reason), true);
  assertEquals(
    summarizeMissingAttachmentFailure(reason),
    "Mailgun fetch failed",
  );
});

Deno.test("attachmentLooksLikeHealthDocument", () => {
  assertEquals(attachmentLooksLikeHealthDocument("image/jpeg", "photo.jpg"), true);
  assertEquals(attachmentLooksLikeHealthDocument("application/pdf", "cert.pdf"), true);
  assertEquals(attachmentLooksLikeHealthDocument("text/plain", "notes.txt"), false);
});

Deno.test("emailLooksLikeUnclassifiedHealthAttempt", () => {
  assertEquals(
    emailLooksLikeUnclassifiedHealthAttempt({
      subject: "Milo Records.",
      attachments: [{ mimeType: "image/jpeg", filename: "cert.jpg" }],
    }),
    true,
  );
  assertEquals(
    emailLooksLikeUnclassifiedHealthAttempt({
      subject: "Hello",
      textBody: "See you tomorrow",
      attachments: [{ mimeType: "text/plain", filename: "notes.txt" }],
    }),
    false,
  );
});
