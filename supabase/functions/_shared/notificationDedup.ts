import { createSupabaseClient } from "./supabase-utils.ts";

const DEFAULT_DEDUPE_WINDOW_MS = 20 * 60 * 1000;

/**
 * Returns true when a push may be sent for this user/key; false when a recent send exists.
 * Uses insert-then-conditional-update so concurrent invocations only win once per window.
 */
export async function claimNotificationDedupe(
  userId: string,
  dedupeKey: string,
  windowMs: number = DEFAULT_DEDUPE_WINDOW_MS,
): Promise<boolean> {
  const supabase = createSupabaseClient();
  const now = new Date().toISOString();
  const cutoff = new Date(Date.now() - windowMs).toISOString();

  const { error: insertError } = await supabase.from("notification_dedupe").insert({
    user_id: userId,
    dedupe_key: dedupeKey,
    sent_at: now,
  });

  if (!insertError) {
    return true;
  }

  if (insertError.code !== "23505") {
    console.error("notification dedupe insert failed:", insertError);
    return true;
  }

  const { data, error: updateError } = await supabase
    .from("notification_dedupe")
    .update({ sent_at: now })
    .eq("user_id", userId)
    .eq("dedupe_key", dedupeKey)
    .lt("sent_at", cutoff)
    .select("dedupe_key");

  if (updateError) {
    console.error("notification dedupe update failed:", updateError);
    return true;
  }

  return !!(data && data.length > 0);
}
