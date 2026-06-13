/**
 * Offline journal when PawBuck.API is unreachable.
 * Degraded tree-shaped flows for vomiting + lethargy (v1.5), plus routine meal/water logs.
 */

import {
  isDietLogText,
  isHydrationLogText,
  isJournalCheckInStartText,
  isLogIntentText,
  isRoutineJournalLogText,
} from "@/utils/miloJournalIntent";
import type { PetJournalEntry } from "@/services/petJournal";
import {
  buildAllGoodTodayOfflineSummary,
  buildJournalCheckInPrompt,
  buildJournalCheckInTopicReplies,
  getRecentIssueJournalEntries,
  isAllGoodTodaySelection,
} from "@/utils/journalCheckInTopics";

export type OfflineJournalTurnResult = {
  answer: string;
  suggestedReplies: string[];
  journalSessionComplete: boolean;
  structuredFields?: Record<string, string>;
};

type OfflineTree =
  | "vomiting_v1.5"
  | "lethargy_v1.5"
  | "eye_ear_v1.5"
  | "diet_log"
  | "hydration_log"
  | "generic";

function detectTree(text: string): OfflineTree {
  const lower = text.toLowerCase();
  if (lower.includes("vomit") || lower.includes("diarr")) return "vomiting_v1.5";
  if (lower.includes("letharg") || lower.includes("tired")) return "lethargy_v1.5";
  if (lower.includes("eye") || lower.includes("ear")) return "eye_ear_v1.5";

  if (isRoutineJournalLogText(text)) {
    if (isHydrationLogText(text) && !isDietLogText(text)) return "hydration_log";
    if (isDietLogText(text)) return "diet_log";
    if (isHydrationLogText(text)) return "hydration_log";
  }

  if (isLogIntentText(text)) {
    if (isHydrationLogText(text) && !isDietLogText(text)) return "hydration_log";
    if (isDietLogText(text)) return "diet_log";
  }

  return "generic";
}

function summarizeLogLine(text: string, maxLen = 72): string {
  const t = text.trim();
  if (t.length <= maxLen) return t;
  return `${t.slice(0, maxLen - 1)}…`;
}

function primaryLogLine(userTurns: string[]): string {
  const substantive = userTurns.filter((t) => {
    const l = t.trim().toLowerCase();
    return l.length > 0 && l !== "save entry" && l !== "not now" && l !== "add details";
  });
  return substantive[substantive.length - 1] ?? userTurns[userTurns.length - 1] ?? "";
}

/**
 * @param userTurns chronological owner messages in this offline session (includes latest)
 */
export function getOfflineJournalTurn(
  userTurns: string[],
  petName: string,
  options?: { recentJournalEntries?: PetJournalEntry[] }
): OfflineJournalTurnResult {
  const combined = userTurns.join("\n");
  const tree = detectTree(combined);
  const step = Math.min(Math.max(userTurns.length - 1, 0), 3);
  const logLine = primaryLogLine(userTurns);
  const recentEntries = options?.recentJournalEntries ?? [];

  if (isAllGoodTodaySelection(logLine)) {
    const issues = getRecentIssueJournalEntries(recentEntries);
    const recovery = buildAllGoodTodayOfflineSummary(petName, issues);
    return {
      answer: recovery.answer,
      suggestedReplies: [],
      journalSessionComplete: true,
      structuredFields: recovery.structuredFields,
    };
  }
  const detail = summarizeLogLine(logLine);
  const lastLower = (userTurns[userTurns.length - 1] ?? "").trim().toLowerCase();

  if (tree === "diet_log") {
    if (lastLower === "not now") {
      return {
        answer: `Okay — no journal entry saved for ${petName}.`,
        suggestedReplies: [],
        journalSessionComplete: false,
      };
    }
    if (step >= 1 && lastLower === "add details") {
      return {
        answer: `Add another message with any extra detail for ${petName}'s meal log.`,
        suggestedReplies: [],
        journalSessionComplete: false,
      };
    }
    return {
      answer: detail
        ? `Logged a meal note for ${petName} (offline): “${detail}”. It will sync when you're back online.`
        : `Logged a meal note for ${petName} (offline). It will sync when you're back online.`,
      suggestedReplies: [],
      journalSessionComplete: true,
      structuredFields: {
        TYPE: "Diet",
        NOTE: logLine.trim() || "Meal log (offline)",
      },
    };
  }

  if (tree === "hydration_log") {
    if (lastLower === "not now") {
      return {
        answer: `Okay — no journal entry saved for ${petName}.`,
        suggestedReplies: [],
        journalSessionComplete: false,
      };
    }
    if (step >= 1 && lastLower === "add details") {
      return {
        answer: `Add another message with any extra detail for ${petName}'s water log.`,
        suggestedReplies: [],
        journalSessionComplete: false,
      };
    }
    return {
      answer: detail
        ? `Logged water intake for ${petName} (offline): “${detail}”. It will sync when you're back online.`
        : `Logged water intake for ${petName} (offline). It will sync when you're back online.`,
      suggestedReplies: [],
      journalSessionComplete: true,
      structuredFields: {
        TYPE: "Hydration",
        NOTE: logLine.trim() || "Water log (offline)",
      },
    };
  }

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

  if (tree === "eye_ear_v1.5") {
    switch (step) {
      case 0:
        return {
          answer: `I'll note an eye or ear concern for ${petName} (offline). Which is it?`,
          suggestedReplies: ["Eye", "Ear", "Both", "Not sure"],
          journalSessionComplete: false,
        };
      case 1:
        return {
          answer: "When did you first notice it?",
          suggestedReplies: ["Just today", "1–2 days", "About a week", "On and off", "Not sure"],
          journalSessionComplete: false,
        };
      default:
        return {
          answer: `Saved an offline eye/ear draft for ${petName}. Sync when you're back online for full Milo notes.`,
          suggestedReplies: [],
          journalSessionComplete: true,
          structuredFields: {
            SYMPTOM: "Eye or ear issue (offline draft)",
            TIMING: "See chat",
          },
        };
    }
  }

  const checkInStart = userTurns.some(isJournalCheckInStartText);

  switch (step) {
    case 0:
      return checkInStart
        ? {
            answer: buildJournalCheckInPrompt(petName, recentEntries),
            suggestedReplies: buildJournalCheckInTopicReplies(recentEntries),
            journalSessionComplete: false,
          }
        : {
            answer: `What's going on with ${petName}?`,
            suggestedReplies: [
              "Just started today",
              "A couple of days",
              "About a week",
              "Not sure",
              "+ Add details",
            ],
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
