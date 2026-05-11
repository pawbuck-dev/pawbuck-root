import { supabase } from "@/utils/supabase";
import type {
  BehaviorBaselineRow,
  BehaviorBaselineUpsertPayload,
} from "@/types/behaviorBaseline";

/**
 * Read the saved behavior baseline for a pet (one row per pet, owner-provided).
 *
 * AI / Milo integration (planned):
 *   When the API builds the **journal-mode** system message for Milo, it should
 *   append a short "Owner behavior baseline (normal for this pet)" section so
 *   the model can contrast today's free-text entry (e.g. skipped meals) against
 *   stored norms (e.g. high food motivation, very talkative, social butterfly).
 *
 *   Server-side hook points (to wire in a fast follow-up):
 *     • Extend `PetConversationalContextDto` (backend/PawBuck.API/Models/
 *       PetConversationalContextModels.cs) with an optional `behaviorBaseline`
 *       object mirroring this row.
 *     • Load it inside
 *       `PetConversationalContextService.GetPetConversationalContextAsync`
 *       parallel to `LoadJournalNotesAsync`.
 *     • Include it in the serialized "facts" string built for journal mode in
 *       `MiloReasoningService` / `ContextEngine.FormatContextForPrompt`.
 *
 *   v1 ships consumer-only persistence — Milo and the briefing keep working
 *   without baseline; once the API reads `pet_behavior_baselines`, baseline
 *   becomes additional grounding context, never a replacement for the journal.
 */
export async function getBaselineContext(
  petId: string
): Promise<BehaviorBaselineRow | null> {
  const { data, error } = await supabase
    .from("pet_behavior_baselines")
    .select("*")
    .eq("pet_id", petId)
    .maybeSingle();

  if (error) throw error;
  return data ?? null;
}

/**
 * Insert-or-update the behavior baseline for a pet. RLS requires the row's
 * `user_id` to match the session user, so we always overwrite whatever the
 * caller passed with `auth.uid()`.
 */
export async function upsertBehaviorBaseline(
  payload: BehaviorBaselineUpsertPayload
): Promise<BehaviorBaselineRow> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const { data, error } = await supabase
    .from("pet_behavior_baselines")
    .upsert(
      {
        ...payload,
        user_id: user.id,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "pet_id" }
    )
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function deleteBehaviorBaseline(petId: string): Promise<void> {
  const { error } = await supabase
    .from("pet_behavior_baselines")
    .delete()
    .eq("pet_id", petId);
  if (error) throw error;
}

export const behaviorBaselineQueryKey = (petId: string | null | undefined) =>
  ["pet_behavior_baseline", petId] as const;
