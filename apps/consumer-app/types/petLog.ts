import type { JournalDomain } from "@/constants/petJournal";

/** Client-side journal log from Milo triage (stored in AsyncStorage + optional Supabase sync). */
export type PetLogSeverity = "low" | "medium" | "high" | "urgent";

export interface PetLogEntry {
  id: string;
  pet_id: string;
  user_id: string;
  note: string;
  created_at: string;
  severity: PetLogSeverity;
  domain: JournalDomain;
  subtype: string;
  tags: string[];
  /** Maps to pet_journal_entries.vet_flagged when synced. */
  vet_flag: boolean;
  source: "milo" | "manual";
  /** Set after successful createJournalEntry. */
  synced_to_server?: boolean;
}
