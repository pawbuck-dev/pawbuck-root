import { resolveEmailReferenceYear } from "./emailReferenceTime.ts";
import { shouldAttemptNlpAppointmentImport } from "./emailBodyForNlp.ts";
import { importIcsAttachmentsToVetBookings } from "./icsVetBookingImport.ts";
import type { ParsedAttachment } from "./types.ts";
import { runNlpAppointmentImportIfEligible } from "./nlpAppointmentImport.ts";
import { isAcceptableNlpSkipReason } from "./pipelineOutcome.ts";
import type { ParsedEmail, Pet } from "./types.ts";

export type HybridCalendarImportResult = {
  newlyInsertedCount: number;
  icsAttempted: boolean;
  nlpAttempted: boolean;
  calendarError: boolean;
  acceptableSkip: boolean;
};

export async function runHybridCalendarImport(params: {
  parsedEmail: ParsedEmail;
  pet: Pet;
  senderEmail: string;
  fileKey: string;
  threadMessageId: string | null;
  icsAttachments: ParsedAttachment[];
}): Promise<HybridCalendarImportResult> {
  const referenceYear = resolveEmailReferenceYear(params.parsedEmail.date);
  let newlyInsertedCount = 0;
  let icsAttempted = false;
  let nlpAttempted = false;
  let calendarError = false;
  let acceptableSkip = false;

  const tryNlpFallback = async (): Promise<void> => {
    if (!shouldAttemptNlpAppointmentImport(params.parsedEmail, false)) {
      acceptableSkip = true;
      return;
    }
    nlpAttempted = true;
    const nlpBatch = await runNlpAppointmentImportIfEligible({
      parsedEmail: params.parsedEmail,
      pet: params.pet,
      senderEmail: params.senderEmail,
      fileKey: params.fileKey,
      threadMessageId: params.threadMessageId,
      hasCalendarAttachments: false,
      referenceYear,
    });
    newlyInsertedCount += nlpBatch.newlyInsertedCount;
    if (nlpBatch.skippedReason && isAcceptableNlpSkipReason(nlpBatch.skippedReason)) {
      acceptableSkip = true;
    }
    if (nlpBatch.skippedReason && nlpBatch.skippedReason !== "not_eligible") {
      console.log(`[MONITORING] NLP calendar import skipped: ${nlpBatch.skippedReason}`);
    }
  };

  if (params.icsAttachments.length > 0) {
    icsAttempted = true;
    try {
      const batch = await importIcsAttachmentsToVetBookings({
        pet: params.pet,
        attachments: params.icsAttachments,
        fileKey: params.fileKey,
        threadMessageId: params.threadMessageId,
      });
      newlyInsertedCount += batch.newlyInsertedCount;
      if (batch.newlyInsertedCount === 0) {
        await tryNlpFallback();
      } else {
        acceptableSkip = true;
      }
    } catch (icsErr) {
      calendarError = true;
      console.error("[MONITORING] ICS import failed:", icsErr);
    }
  } else if (shouldAttemptNlpAppointmentImport(params.parsedEmail, false)) {
    try {
      await tryNlpFallback();
    } catch (nlpErr) {
      calendarError = true;
      console.error("[MONITORING] NLP appointment import failed:", nlpErr);
    }
  } else {
    acceptableSkip = true;
  }

  if (newlyInsertedCount > 0) {
    acceptableSkip = true;
  }

  return {
    newlyInsertedCount,
    icsAttempted,
    nlpAttempted,
    calendarError,
    acceptableSkip,
  };
}
