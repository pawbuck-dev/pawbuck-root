import type { ProcessedAttachment } from "./types.ts";

export type EmailPipelineOutcome = {
  messageStored: boolean;
  messageStorageFailed: boolean;
  calendar: {
    attempted: boolean;
    error: boolean;
    insertedCount: number;
    acceptableSkip: boolean;
  };
  attachments: {
    attempted: boolean;
    total: number;
    dbInserted: number;
    hardFailures: number;
    skippedValid: number;
  };
};

export function createInitialPipelineOutcome(): EmailPipelineOutcome {
  return {
    messageStored: false,
    messageStorageFailed: false,
    calendar: {
      attempted: false,
      error: false,
      insertedCount: 0,
      acceptableSkip: false,
    },
    attachments: {
      attempted: false,
      total: 0,
      dbInserted: 0,
      hardFailures: 0,
      skippedValid: 0,
    },
  };
}

const ACCEPTABLE_NLP_SKIP_REASONS = new Set([
  "not_eligible",
  "below_threshold_or_not_found",
  "duplicate",
]);

export function isAcceptableNlpSkipReason(reason: string | null | undefined): boolean {
  if (!reason) return false;
  return ACCEPTABLE_NLP_SKIP_REASONS.has(reason);
}

export function computeEmailSuccess(outcome: EmailPipelineOutcome): boolean {
  if (outcome.calendar.attempted && outcome.calendar.error) return false;
  if (
    outcome.calendar.attempted &&
    outcome.calendar.insertedCount === 0 &&
    !outcome.calendar.acceptableSkip
  ) {
    return false;
  }
  if (outcome.attachments.attempted && outcome.attachments.hardFailures > 0) return false;
  return true;
}

export function tallyAttachmentOutcomes(
  processed: ProcessedAttachment[]
): Pick<EmailPipelineOutcome["attachments"], "attempted" | "total" | "dbInserted" | "hardFailures" | "skippedValid"> {
  let dbInserted = 0;
  let hardFailures = 0;
  let skippedValid = 0;

  for (const a of processed) {
    if (a.dbInserted || a.vaultPersisted) {
      dbInserted++;
      continue;
    }
    if (a.skippedReason) {
      skippedValid++;
      continue;
    }
    if (a.classification?.type === "irrelevant") continue;
    hardFailures++;
  }

  return {
    attempted: processed.length > 0,
    total: processed.length,
    dbInserted,
    hardFailures,
    skippedValid,
  };
}

export function summarizePipelineFailure(outcome: EmailPipelineOutcome): string | null {
  const parts: string[] = [];
  if (outcome.messageStorageFailed) parts.push("message_storage_failed");
  if (outcome.calendar.attempted && outcome.calendar.error) parts.push("calendar_import_error");
  if (
    outcome.calendar.attempted &&
    outcome.calendar.insertedCount === 0 &&
    !outcome.calendar.acceptableSkip
  ) {
    parts.push("calendar_no_import");
  }
  if (outcome.attachments.hardFailures > 0) {
    parts.push(`attachment_failures:${outcome.attachments.hardFailures}`);
  }
  return parts.length > 0 ? parts.join(";") : null;
}
