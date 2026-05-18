import {
  computeEmailSuccess,
  createInitialPipelineOutcome,
  summarizePipelineFailure,
  tallyAttachmentOutcomes,
} from "./pipelineOutcome.ts";
import { assertEquals } from "jsr:@std/assert";

Deno.test("computeEmailSuccess fails on calendar error", () => {
  const o = createInitialPipelineOutcome();
  o.calendar.attempted = true;
  o.calendar.error = true;
  assertEquals(computeEmailSuccess(o), false);
});

Deno.test("computeEmailSuccess allows acceptable calendar skip", () => {
  const o = createInitialPipelineOutcome();
  o.calendar.attempted = true;
  o.calendar.acceptableSkip = true;
  assertEquals(computeEmailSuccess(o), true);
});

Deno.test("tallyAttachmentOutcomes counts vaultPersisted as success", () => {
  const tally = tallyAttachmentOutcomes([
    {
      filename: "a.pdf",
      mimeType: "application/pdf",
      size: 1,
      classification: { type: "vaccinations", confidence: 0.9 },
      uploaded: true,
      ocrTriggered: true,
      ocrSuccess: true,
      dbInserted: false,
      vaultPersisted: true,
    },
  ]);
  assertEquals(tally.dbInserted, 1);
  assertEquals(tally.hardFailures, 0);
});

Deno.test("tallyAttachmentOutcomes counts hard failures", () => {
  const tally = tallyAttachmentOutcomes([
    {
      filename: "a.pdf",
      mimeType: "application/pdf",
      size: 1,
      classification: { type: "vaccinations", confidence: 0.9 },
      uploaded: true,
      ocrTriggered: true,
      ocrSuccess: false,
      dbInserted: false,
    },
  ]);
  assertEquals(tally.hardFailures, 1);
});

Deno.test("tallyAttachmentOutcomes counts pet validation skips as hard failures", () => {
  const tally = tallyAttachmentOutcomes([
    {
      filename: "vax.pdf",
      mimeType: "application/pdf",
      size: 1,
      classification: { type: "vaccinations", confidence: 0.9 },
      uploaded: false,
      ocrTriggered: false,
      ocrSuccess: false,
      dbInserted: false,
      skippedReason: "no_pet_info",
    },
  ]);
  assertEquals(tally.hardFailures, 1);
  assertEquals(tally.skippedValid, 0);
});

Deno.test("summarizePipelineFailure joins reasons", () => {
  const o = createInitialPipelineOutcome();
  o.attachments.hardFailures = 2;
  assertEquals(summarizePipelineFailure(o), "attachment_failures:2");
});
