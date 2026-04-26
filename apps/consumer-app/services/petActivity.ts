import type { RealtimeChannel } from "@supabase/supabase-js";
import { supabase } from "@/utils/supabase";

export type PetActivityEventRow = {
  id: string;
  pet_id: string;
  actor_id: string;
  kind: string;
  summary: string;
  ref_table: string | null;
  ref_id: string | null;
  payload: Record<string, unknown>;
  created_at: string;
};

export type PetFamilyNotificationPrefsRow = {
  pet_id: string;
  user_id: string;
  care_activity_scope: "all" | "meds_only" | "journal_only" | "none";
  lifecycle_push_enabled: boolean;
  care_push_enabled: boolean;
  updated_at: string;
};

export async function fetchPetActivityEvents(
  petId: string,
  limit = 40
): Promise<PetActivityEventRow[]> {
  const { data, error } = await supabase
    .from("pet_activity_events")
    .select(
      "id, pet_id, actor_id, kind, summary, ref_table, ref_id, payload, created_at"
    )
    .eq("pet_id", petId)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) throw new Error(error.message);
  return (data ?? []) as PetActivityEventRow[];
}

export function subscribePetActivityEvents(
  petId: string,
  onInsert: (row: PetActivityEventRow) => void
): RealtimeChannel {
  const channel = supabase
    .channel(`pet_activity:${petId}`)
    .on(
      "postgres_changes",
      {
        event: "INSERT",
        schema: "public",
        table: "pet_activity_events",
        filter: `pet_id=eq.${petId}`,
      },
      (payload) => {
        const row = payload.new as PetActivityEventRow;
        if (row?.pet_id === petId) onInsert(row);
      }
    )
    .subscribe();

  return channel;
}

export async function fetchPetNotificationPrefs(
  petId: string,
  userId: string
): Promise<PetFamilyNotificationPrefsRow | null> {
  const { data, error } = await supabase
    .from("pet_family_notification_prefs")
    .select(
      "pet_id, user_id, care_activity_scope, lifecycle_push_enabled, care_push_enabled, updated_at"
    )
    .eq("pet_id", petId)
    .eq("user_id", userId)
    .maybeSingle();

  if (error) throw new Error(error.message);
  return data as PetFamilyNotificationPrefsRow | null;
}

export async function upsertPetNotificationPrefs(
  petId: string,
  userId: string,
  patch: Partial<
    Pick<
      PetFamilyNotificationPrefsRow,
      | "care_activity_scope"
      | "lifecycle_push_enabled"
      | "care_push_enabled"
    >
  >
): Promise<void> {
  const { error } = await supabase.from("pet_family_notification_prefs").upsert(
    {
      pet_id: petId,
      user_id: userId,
      ...patch,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "pet_id,user_id" }
  );

  if (error) throw new Error(error.message);
}
