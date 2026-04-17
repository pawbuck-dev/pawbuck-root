import { createJournalEntry } from "@/services/petJournal";
import type { PetLogEntry } from "@/types/petLog";
import AsyncStorage from "@react-native-async-storage/async-storage";

const STORAGE_KEY = "pawbuck_milo_journal_v1";

type StoreShape = Record<string, PetLogEntry[]>;

function key(userId: string, petId: string): string {
  return `${userId}::${petId}`;
}

async function readAll(): Promise<StoreShape> {
  const raw = await AsyncStorage.getItem(STORAGE_KEY);
  if (!raw) return {};
  try {
    return JSON.parse(raw) as StoreShape;
  } catch {
    return {};
  }
}

async function writeAll(data: StoreShape): Promise<void> {
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

export async function loadPetLogsForPet(userId: string, petId: string): Promise<PetLogEntry[]> {
  const all = await readAll();
  return all[key(userId, petId)] ?? [];
}

export async function appendPetLog(userId: string, entry: PetLogEntry): Promise<void> {
  const all = await readAll();
  const k = key(userId, entry.pet_id);
  const list = all[k] ?? [];
  list.unshift(entry);
  all[k] = list.slice(0, 200);
  await writeAll(all);
}

async function removePetLogById(userId: string, petId: string, localId: string): Promise<void> {
  const all = await readAll();
  const k = key(userId, petId);
  const list = all[k] ?? [];
  all[k] = list.filter((e) => e.id !== localId);
  await writeAll(all);
}

/**
 * Persist Milo log to Supabase pet_journal_entries (follow-up from plan).
 * Removes local copy after success so the journal list does not duplicate server rows.
 */
export async function syncPetLogToServer(entry: PetLogEntry): Promise<void> {
  if (entry.synced_to_server) return;
  const entryDate = entry.created_at.slice(0, 10);
  await createJournalEntry({
    pet_id: entry.pet_id,
    domain: entry.domain,
    subtype: entry.subtype,
    note: entry.note,
    vet_flagged: entry.vet_flag,
    entry_date: entryDate,
  });
  await removePetLogById(entry.user_id, entry.pet_id, entry.id);
}
