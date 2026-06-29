import { applyDismissals, snoozeUntilYmd, type CareNudgeDismissalRow } from "@pawbuck/care-nudges";
import { supabase } from "@/utils/supabase";

export type { CareNudgeDismissalRow };

export async function fetchCareNudgeDismissals(userId: string): Promise<CareNudgeDismissalRow[]> {
  const { data, error } = await supabase
    .from("care_nudge_dismissals" as "user_preferences")
    .select("pet_id, nudge_kind, dismissed_until")
    .eq("user_id", userId);

  if (error) {
    console.warn("fetchCareNudgeDismissals", error.message);
    return [];
  }

  return (data ?? []).map((row) => ({
    pet_id: String((row as { pet_id: string }).pet_id),
    nudge_kind: String((row as { nudge_kind: string }).nudge_kind),
    dismissed_until: (row as { dismissed_until: string | null }).dismissed_until,
  }));
}

export async function snoozeCareNudge(input: {
  userId: string;
  petId: string;
  nudgeKind: string;
  snoozeDays?: number;
}): Promise<void> {
  const dismissed_until = snoozeUntilYmd(new Date(), input.snoozeDays ?? 7);
  const { error } = await supabase
    .from("care_nudge_dismissals" as "user_preferences")
    .upsert(
      {
        user_id: input.userId,
        pet_id: input.petId,
        nudge_kind: input.nudgeKind,
        dismissed_until,
        updated_at: new Date().toISOString(),
      } as never,
      { onConflict: "user_id,pet_id,nudge_kind" }
    );

  if (error) throw new Error(error.message);
}

export function filterNudgesWithDismissals<T extends { kind: string; petId: string }>(
  nudges: readonly T[],
  dismissals: readonly CareNudgeDismissalRow[],
  now = new Date()
): T[] {
  return applyDismissals(nudges, dismissals, now.toISOString().slice(0, 10));
}
