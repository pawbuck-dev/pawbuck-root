import type { Tables, TablesInsert } from "@/database.types";
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
