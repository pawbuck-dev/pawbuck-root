/** @deprecated Use {@link resolveMiloAssistantFooter} — per-bubble footers are contextual now. */
export const MILO_ASSISTANT_RESPONSE_FOOTER = "AI-generated. Not veterinary advice.";

/** Health Briefing screen and home snapshot card. */
export const HEALTH_BRIEFING_FOOTER_DISCLAIMER =
  "This summary is generated from your journal entries. It is not a clinical diagnosis.";

/** First-run journal triage acknowledgment (shown once per user on this device). */
export const MILO_TRIAGE_DISCLAIMER_TITLE = "Before you continue";

export const MILO_TRIAGE_DISCLAIMER_BODY = `Milo’s health journal uses artificial intelligence to help you record observations about your pet. It does not examine your pet, review medical records, or replace a licensed veterinarian.

Information may be incomplete, outdated, or incorrect. AI can make mistakes. For any health concern, examination, diagnosis, treatment, or emergency, contact a qualified veterinary professional right away.

By continuing, you confirm that you understand these limits and will not rely on Milo as a substitute for veterinary care.`;

/** Same acknowledgment as journal triage; separate one-time flag for general Milo chat (modal). */
export const MILO_GENERAL_CHAT_DISCLAIMER_TITLE = MILO_TRIAGE_DISCLAIMER_TITLE;
export const MILO_GENERAL_CHAT_DISCLAIMER_BODY = MILO_TRIAGE_DISCLAIMER_BODY;
