/**
 * When PawBuck.API is unreachable, drive a short journal interview locally
 * (same shape as journalMode API: answer + chips + completion).
 */

export type OfflineJournalTurnResult = {
  answer: string;
  suggestedReplies: string[];
  journalSessionComplete: boolean;
};

/**
 * @param priorUserLineCount — number of user messages already in the thread *before* the current send
 *   (0 = first user message failed API, 1 = second user message failed, …).
 */
export function getOfflineJournalTurn(
  priorUserLineCount: number,
  petName: string
): OfflineJournalTurnResult {
  const step = Math.min(Math.max(priorUserLineCount, 0), 2);
  switch (step) {
    case 0:
      return {
        answer: `Thanks for the update on ${petName}. One quick question so I can log this well: How long has this been going on?`,
        suggestedReplies: [
          "Just started today",
          "A couple of days",
          "About a week",
          "On and off",
        ],
        journalSessionComplete: false,
      };
    case 1:
      return {
        answer: `Got it. Anything else you've noticed that seems different about ${petName} lately?`,
        suggestedReplies: [
          "Eating less",
          "More tired",
          "Acting normal otherwise",
          "A few other things",
        ],
        journalSessionComplete: false,
      };
    default:
      return {
        answer: `All information recorded for ${petName}. This journal entry is saved for your records.`,
        suggestedReplies: [],
        journalSessionComplete: true,
      };
  }
}
