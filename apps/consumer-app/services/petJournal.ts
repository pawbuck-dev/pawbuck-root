import type { Tables, TablesInsert, TablesUpdate } from "@/database.types";
import { supabase } from "@/utils/supabase";
import type { JournalDomain } from "@/constants/petJournal";

export type PetJournalEntry = Tables<"pet_journal_entries">;

export async function fetchJournalEntries(
  petId: string,
  domain?: JournalDomain
): Promise<PetJournalEntry[]> {
  let q = supabase
    .from("pet_journal_entries")
    .select("*")
    .eq("pet_id", petId)
    .order("entry_date", { ascending: false })
    .order("created_at", { ascending: false });

  if (domain) q = q.eq("domain", domain);

  const { data, error } = await q;
  if (error) throw error;
  return data ?? [];
}

const ALL_DOMAINS: JournalDomain[] = ["health", "behavioral", "environmental"];

/** All journal entries for a pet (used in transfer flow: pins & exclusions). */
export async function fetchAllJournalEntriesForPet(petId: string): Promise<PetJournalEntry[]> {
  const chunks = await Promise.all(ALL_DOMAINS.map((d) => fetchJournalEntries(petId, d)));
  const byId = new Map<string, PetJournalEntry>();
  for (const c of chunks) {
    for (const e of c) {
      byId.set(e.id, e);
    }
  }
  return Array.from(byId.values()).sort((a, b) => {
    const ta = `${a.entry_date}T${a.created_at?.slice(11) ?? "00:00:00"}`;
    const tb = `${b.entry_date}T${b.created_at?.slice(11) ?? "00:00:00"}`;
    return tb.localeCompare(ta);
  });
}

export type TransferHighlightRow = {
  sort_order: number;
  entry: PetJournalEntry;
};

/** Journal entries the previous owner highlighted at transfer (US-PT-003). */
export async function fetchTransferHighlightEntries(petId: string): Promise<TransferHighlightRow[]> {
  const { data: rows, error: hErr } = await supabase
    .from("pet_journal_transfer_highlights")
    .select("journal_entry_id, sort_order")
    .eq("pet_id", petId)
    .order("sort_order", { ascending: true });

  if (hErr) throw hErr;
  if (!rows?.length) return [];

  const ids = rows.map((r) => r.journal_entry_id);
  const { data: entries, error: eErr } = await supabase
    .from("pet_journal_entries")
    .select("*")
    .in("id", ids);

  if (eErr) throw eErr;
  const entryById = new Map((entries ?? []).map((e) => [e.id, e as PetJournalEntry]));

  return rows
    .map((r) => {
      const entry = entryById.get(r.journal_entry_id);
      if (!entry) return null;
      return { sort_order: r.sort_order, entry };
    })
    .filter((x): x is TransferHighlightRow => x != null);
}

export async function createJournalEntry(
  row: Omit<TablesInsert<"pet_journal_entries">, "user_id"> & { user_id?: string }
): Promise<PetJournalEntry> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const { data, error } = await supabase
    .from("pet_journal_entries")
    .insert({
      ...row,
      user_id: user.id,
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function deleteJournalEntry(id: string): Promise<void> {
  const { error } = await supabase.from("pet_journal_entries").delete().eq("id", id);
  if (error) throw error;
}

export async function updateJournalEntry(
  id: string,
  patch: Pick<
    TablesUpdate<"pet_journal_entries">,
    | "note"
    | "vet_flagged"
    | "subtype"
    | "entry_date"
    | "domain"
    | "linked_clinical_exam_id"
    | "triage_status"
  >
): Promise<void> {
  const { error } = await supabase
    .from("pet_journal_entries")
    .update({
      ...patch,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id);
  if (error) throw error;
}

/** Associate a health journal row with this clinical visit; DB clears active triage flags. */
export async function linkJournalEntryToClinicalExam(
  journalEntryId: string,
  clinicalExamId: string
): Promise<void> {
  await updateJournalEntry(journalEntryId, { linked_clinical_exam_id: clinicalExamId });
}

export async function fetchPetAllergies(petId: string): Promise<Tables<"pet_allergies">[]> {
  const { data, error } = await supabase
    .from("pet_allergies")
    .select("*")
    .eq("pet_id", petId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function createPetAllergy(
  row: Omit<TablesInsert<"pet_allergies">, "user_id">
): Promise<Tables<"pet_allergies">> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");
  const { data, error } = await supabase
    .from("pet_allergies")
    .insert({ ...row, user_id: user.id })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function fetchPetConditions(petId: string): Promise<Tables<"pet_conditions">[]> {
  const { data, error } = await supabase
    .from("pet_conditions")
    .select("*")
    .eq("pet_id", petId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function createPetCondition(
  row: Omit<TablesInsert<"pet_conditions">, "user_id">
): Promise<Tables<"pet_conditions">> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");
  const { data, error } = await supabase
    .from("pet_conditions")
    .insert({ ...row, user_id: user.id })
    .select()
    .single();
  if (error) throw error;
  return data;
}
