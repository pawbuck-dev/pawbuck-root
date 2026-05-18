import {
  buildNlpEmailImportKey,
  formatServiceLabelForStorage,
  parseNlpAppointmentExtraction,
  shouldPersistNlpExtraction,
} from "./nlpAppointmentTypes.ts";
import { assertEquals } from "jsr:@std/assert";
import { shouldAttemptNlpAppointmentImport } from "./emailBodyForNlp.ts";

Deno.test("shouldPersistNlpExtraction requires threshold and fields", () => {
  assertEquals(
    shouldPersistNlpExtraction({
      is_appointment_found: true,
      confidence_score: 0.9,
      category: "grooming",
      service_label: "Full groom",
      start_at: "2026-05-20T16:00:00",
      end_at: null,
      provider_name: "Pampered Paws",
      notes: null,
    }),
    true
  );
  assertEquals(
    shouldPersistNlpExtraction({
      is_appointment_found: true,
      confidence_score: 0.5,
      category: "grooming",
      service_label: "Full groom",
      start_at: "2026-05-20T16:00:00",
      end_at: null,
      provider_name: "Pampered Paws",
      notes: null,
    }),
    false
  );
});

Deno.test("buildNlpEmailImportKey uses messageId when present", () => {
  assertEquals(buildNlpEmailImportKey("<abc@mail>", "s3/key"), "nlp:<abc@mail>");
  assertEquals(buildNlpEmailImportKey(null, "s3/key"), "nlp:s3/key");
});

Deno.test("formatServiceLabelForStorage prefixes non-vet categories", () => {
  assertEquals(formatServiceLabelForStorage("grooming", "Full bath"), "[Grooming] Full bath");
});

Deno.test("parseNlpAppointmentExtraction normalizes category", () => {
  const p = parseNlpAppointmentExtraction({
    is_appointment_found: true,
    confidence_score: 0.95,
    category: "walk",
    service_label: "Afternoon walk",
    start_at: "2026-05-21T15:00:00",
    end_at: null,
    provider_name: "Alex",
    notes: null,
  });
  assertEquals(p.category, "walk");
});

Deno.test("shouldAttemptNlpAppointmentImport skips when ICS present", () => {
  assertEquals(
    shouldAttemptNlpAppointmentImport(
      {
        from: null,
        to: [],
        cc: [],
        subject: "Confirmed",
        date: null,
        messageId: null,
        textBody: "Your appointment is confirmed for Tuesday at 4PM.",
        htmlBody: null,
        attachments: [{ filename: "a.ics", mimeType: "text/calendar", size: 1, content: "" }],
      },
      true
    ),
    false
  );
});
