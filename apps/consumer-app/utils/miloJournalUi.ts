import type { JournalInterviewPhase } from "@/types/journalInterview";

export type MiloSummaryMessage = {
  role: "user" | "assistant";
  interviewPhase?: JournalInterviewPhase;
  structuredSummary?: unknown;
  journalSessionComplete?: boolean;
};

/** Show summary draft card only on the latest unanswered summary_draft (hide stale drafts after save). */
export function shouldShowStructuredSummaryCard(
  message: MiloSummaryMessage,
  messageIndex: number,
  allMessages: MiloSummaryMessage[]
): boolean {
  if (message.role !== "assistant") return false;
  if (message.interviewPhase !== "summary_draft" || !message.structuredSummary) return false;

  const hasLaterSessionComplete = allMessages
    .slice(messageIndex + 1)
    .some((m) => m.role === "assistant" && m.journalSessionComplete === true);
  if (hasLaterSessionComplete) return false;

  const laterDraftIndex = allMessages.findIndex(
    (m, i) =>
      i > messageIndex &&
      m.role === "assistant" &&
      m.interviewPhase === "summary_draft" &&
      !!m.structuredSummary
  );
  if (laterDraftIndex >= 0) return false;

  return true;
}
