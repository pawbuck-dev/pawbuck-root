/**
 * Offline journal when PawBuck.API is unreachable.
 * Degraded tree-shaped flows for vomiting + lethargy (v1.5).
 */

export type OfflineJournalTurnResult = {
  answer: string;
  suggestedReplies: string[];
  journalSessionComplete: boolean;
  structuredFields?: Record<string, string>;
};

type OfflineTree = "vomiting_v1.5" | "lethargy_v1.5" | "generic";

function detectTree(text: string): OfflineTree {
  const lower = text.toLowerCase();
  if (lower.includes("vomit") || lower.includes("diarr")) return "vomiting_v1.5";
  if (lower.includes("letharg") || lower.includes("tired")) return "lethargy_v1.5";
  return "generic";
}

/**
 * @param priorUserLineCount user messages before this failed send
 * @param lastUserMessage latest user text (for tree detection on step 0)
 */
export function getOfflineJournalTurn(
  priorUserLineCount: number,
  petName: string,
  lastUserMessage?: string
): OfflineJournalTurnResult {
  const tree = detectTree(lastUserMessage ?? "");
  const step = Math.min(Math.max(priorUserLineCount, 0), 3);

  if (tree === "vomiting_v1.5") {
    switch (step) {
      case 0:
        return {
          answer: `I'll note what's going on with ${petName} (offline). When did vomiting or diarrhea start?`,
          suggestedReplies: ["Just today", "1–2 days", "About a week", "On and off", "Not sure"],
          journalSessionComplete: false,
        };
      case 1:
        return {
          answer: "What did it look like?",
          suggestedReplies: ["Food", "Yellow bile", "Foam", "Blood noticed", "Not sure"],
          journalSessionComplete: false,
        };
      case 2:
        return {
          answer: "How is appetite?",
          suggestedReplies: ["Normal", "Eating less", "Not eating", "Not sure"],
          journalSessionComplete: false,
        };
      default:
        return {
          answer: `Saved an offline draft for ${petName}. Sync when you're back online for full Milo notes.`,
          suggestedReplies: [],
          journalSessionComplete: true,
          structuredFields: {
            SYMPTOM: "Vomiting/diarrhea (offline draft)",
            TIMING: "See chat",
            APPETITE: "See chat",
          },
        };
    }
  }

  if (tree === "lethargy_v1.5") {
    switch (step) {
      case 0:
        return {
          answer: `Logging low energy for ${petName} (offline). How tired compared to usual?`,
          suggestedReplies: ["A little off", "Much less active", "Barely moving", "Not sure"],
          journalSessionComplete: false,
        };
      case 1:
        return {
          answer: "Eating and drinking?",
          suggestedReplies: ["Normal", "Eating less", "Not eating", "Drinking more", "Not sure"],
          journalSessionComplete: false,
        };
      default:
        return {
          answer: `Saved an offline lethargy draft for ${petName}.`,
          suggestedReplies: [],
          journalSessionComplete: true,
          structuredFields: {
            SYMPTOM: "Lethargy (offline draft)",
            ENERGY: "See chat",
            APPETITE: "See chat",
          },
        };
    }
  }

  switch (step) {
    case 0:
      return {
        answer: `Thanks for the update on ${petName}. How long has this been going on?`,
        suggestedReplies: ["Just started today", "A couple of days", "About a week", "Not sure", "+ Add details"],
        journalSessionComplete: false,
      };
    case 1:
      return {
        answer: `Anything else different about ${petName}?`,
        suggestedReplies: ["Eating less", "More tired", "Vomiting", "Nothing else", "Not sure"],
        journalSessionComplete: false,
      };
    default:
      return {
        answer: `I've saved an offline journal note for ${petName}. Connect to sync the full interview.`,
        suggestedReplies: [],
        journalSessionComplete: true,
      };
  }
}
