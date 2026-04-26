import type { Tables } from "@/database.types";

export type JournalTriageFields = Pick<
  Tables<"pet_journal_entries">,
  "vet_flagged" | "domain" | "triage_status"
>;

/** Health journal rows that should surface in briefing / flag counts (not yet cleared by a visit). */
export function journalEntryNeedsTriageAttention(j: JournalTriageFields): boolean {
  const status = j.triage_status ?? "active";
  return j.domain === "health" && j.vet_flagged && status !== "resolved";
}
