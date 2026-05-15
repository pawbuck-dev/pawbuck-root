/** Per-bubble footer when Milo gives health-oriented guidance (not product how-to). */
export const MILO_HEALTH_ADVICE_FOOTER = "Not veterinary advice.";

export type MiloAssistantFooterInput = {
  content: string;
  usedPetData?: boolean;
  usedRag?: boolean;
  /** Journal interview screen — session disclaimer already covers AI limits. */
  isJournalMode?: boolean;
};

/** Document-upload confirmations in general Milo chat — not health advice. */
const DOCUMENT_UPLOAD_ASSISTANT_RE =
  /^(I've filed this under|I saved the file for)/i;

/** Milo clinical scribe replies start with a Summary section. */
const CLINICAL_SUMMARY_RE = /^###\s*Summary\b/m;

const HEALTH_ADVICE_CONTENT_RE =
  /please consult your veterinarian|not veterinary advice|needs review:|critical symptom:|emergency vet|seek (?:immediate |urgent )?(?:veterinary|vet)/i;

/**
 * Small footer under Milo assistant bubbles. First-run disclaimers already cover AI limits;
 * repeat "AI-generated" on every bubble felt generic on product help and journal questions.
 */
export function resolveMiloAssistantFooter(input: MiloAssistantFooterInput): string | null {
  if (input.isJournalMode) return null;

  const content = input.content.trim();
  if (!content || DOCUMENT_UPLOAD_ASSISTANT_RE.test(content)) return null;

  if (input.usedRag && !input.usedPetData) return null;

  if (input.usedPetData) return MILO_HEALTH_ADVICE_FOOTER;

  if (CLINICAL_SUMMARY_RE.test(content) || HEALTH_ADVICE_CONTENT_RE.test(content)) {
    return MILO_HEALTH_ADVICE_FOOTER;
  }

  return null;
}
